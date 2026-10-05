-- Keep completed client profiles private until an administrator approves them.
-- Admin publication continues through admin_set_profile_publication, which is
-- service-role-only and called after the application verifies the admin role.
create or replace function public.complete_own_onboarding_publish(p_publish boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_owner_id uuid := auth.uid();
  v_role text;
  v_completed_steps text[];
  v_has_progress boolean;
  v_has_claimed_registration boolean;
  v_updated_profiles integer;
  v_slug text;
begin
  if v_owner_id is null then raise sqlstate '42501' using message = 'Authentication required'; end if;
  if p_publish is null then raise sqlstate '22004' using message = 'Publication choice is required'; end if;

  select user_accounts.role into v_role from public.user_accounts where user_accounts.id = v_owner_id;
  if p_publish and v_role = 'client' then
    raise sqlstate '42501' using message = 'Publication requires administrator approval';
  end if;

  select onboarding_progress.completed_steps into v_completed_steps
  from public.onboarding_progress where onboarding_progress.owner_id = v_owner_id for update;
  v_has_progress := found;
  select exists (
    select 1 from public.registration_intents
    where registration_intents.owner_id = v_owner_id and registration_intents.status = 'claimed'
  ) into v_has_claimed_registration;
  if v_has_progress then
    if not (array['identity', 'contact', 'content', 'address', 'preview']::text[] <@ v_completed_steps) then
      raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
    end if;
  elsif v_has_claimed_registration then
    raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
  end if;

  if p_publish then perform public.assert_own_onboarding_prerequisites(v_owner_id, 'publish'); end if;
  update public.profiles
  set status = case when p_publish then 'published' else 'draft' end,
      published_at = case when p_publish then pg_catalog.now() else null end
  where profiles.owner_id = v_owner_id returning profiles.slug into v_slug;
  get diagnostics v_updated_profiles = row_count;
  if v_updated_profiles <> 1 then raise sqlstate 'P0002' using message = 'Profile not found'; end if;

  if v_has_progress or p_publish then
    insert into public.onboarding_progress (owner_id, current_step, completed_steps, completed_at)
    values (v_owner_id, 'publish', array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[], pg_catalog.now())
    on conflict (owner_id) do update set current_step = 'publish',
      completed_steps = array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[],
      completed_at = pg_catalog.now();
  end if;
  return v_slug;
end; $$;

revoke all on function public.complete_own_onboarding_publish(boolean) from public, anon, service_role;
grant execute on function public.complete_own_onboarding_publish(boolean) to authenticated;

notify pgrst, 'reload schema';
