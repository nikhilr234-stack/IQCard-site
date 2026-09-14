-- This migration supersedes the broad owner policies and publication function
-- definitions from earlier migrations without rewriting already-applied history.
-- RLS chooses owner rows; column grants ensure an authenticated owner cannot
-- directly set status, published_at, or another owner's id.
drop policy if exists "owners manage their profile" on public.profiles;
drop policy if exists "owners read their profile" on public.profiles;
drop policy if exists "owners create their profile" on public.profiles;
drop policy if exists "owners edit their profile" on public.profiles;

create policy "owners read their profile"
on public.profiles for select to authenticated
using (owner_id = auth.uid());

create policy "owners create their profile"
on public.profiles for insert to authenticated
with check (
  owner_id = auth.uid()
  and (photo_path is null or photo_path like auth.uid()::text || '/%')
);

create policy "owners edit their profile"
on public.profiles for update to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and (photo_path is null or photo_path like auth.uid()::text || '/%')
);

revoke all privileges on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant insert (
  owner_id,
  slug,
  full_name,
  headline,
  tagline,
  bio,
  phone,
  email,
  photo_path,
  whatsapp,
  location,
  public_email_visible,
  phone_visible,
  whatsapp_visible,
  location_visible
) on table public.profiles to authenticated;
grant update (
  slug,
  full_name,
  headline,
  tagline,
  bio,
  phone,
  email,
  photo_path,
  whatsapp,
  location,
  public_email_visible,
  phone_visible,
  whatsapp_visible,
  location_visible
) on table public.profiles to authenticated;

-- A row is the durable v2 enrollment marker. Owners can read it, but cannot
-- create, delete, or forge completed steps outside the ordered RPCs below.
drop policy if exists "owners manage their onboarding progress" on public.onboarding_progress;
drop policy if exists "owners read their onboarding progress" on public.onboarding_progress;
create policy "owners read their onboarding progress"
on public.onboarding_progress for select to authenticated
using (owner_id = auth.uid());

revoke all privileges on table public.onboarding_progress from authenticated;
grant select on table public.onboarding_progress to authenticated;

create or replace function public.start_own_onboarding()
returns public.onboarding_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_progress public.onboarding_progress%rowtype;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  insert into public.onboarding_progress (owner_id)
  values (v_owner_id)
  on conflict (owner_id) do nothing;

  select onboarding_progress.*
  into strict v_progress
  from public.onboarding_progress
  where onboarding_progress.owner_id = v_owner_id;

  return v_progress;
end;
$$;

revoke all on function public.start_own_onboarding() from public, anon, service_role;
grant execute on function public.start_own_onboarding() to authenticated;

-- This private helper makes completed v2 steps evidence of validated persisted
-- data, rather than a caller-controlled sequence of acknowledgements. Empty
-- optional contact fields and an empty links list remain valid UI states; any
-- supplied value must satisfy the same shape constraints as the onboarding UI.
create or replace function public.assert_own_onboarding_prerequisites(
  p_owner_id uuid,
  p_target_step text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select profiles.*
  into strict v_profile
  from public.profiles
  where profiles.owner_id = p_owner_id
  for update;

  if p_target_step in ('identity', 'contact', 'content', 'address', 'preview', 'publish')
    and pg_catalog.cardinality(pg_catalog.regexp_split_to_array(pg_catalog.btrim(v_profile.full_name), '\\s+')) < 2 then
    raise sqlstate 'P0001' using message = 'Complete your identity first';
  end if;

  if p_target_step in ('contact', 'content', 'address', 'preview', 'publish')
    and (
      (v_profile.email <> '' and v_profile.email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$')
      or (v_profile.phone <> '' and (v_profile.phone !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_profile.phone, '[^0-9]', '', 'g')) not between 7 and 15))
      or (v_profile.whatsapp <> '' and (v_profile.whatsapp !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_profile.whatsapp, '[^0-9]', '', 'g')) not between 7 and 15))
      or pg_catalog.length(v_profile.location) > 120
    ) then
    raise sqlstate 'P0001' using message = 'Complete your contact details first';
  end if;

  if p_target_step in ('content', 'address', 'preview', 'publish') and exists (
    select 1
    from public.profile_links
    where profile_links.profile_id = v_profile.id
      and (
        pg_catalog.length(pg_catalog.btrim(profile_links.label)) not between 1 and 60
        or pg_catalog.btrim(profile_links.url) !~* '^(https:|mailto:|tel:)'
      )
  ) then
    raise sqlstate 'P0001' using message = 'Complete your profile links first';
  end if;

  if p_target_step in ('address', 'preview', 'publish')
    and (v_profile.slug in ('admin', 'api', 'auth', 'dashboard', 'login', 'iq', 'register', 'onboarding', 'customize')
      or v_profile.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') then
    raise sqlstate 'P0001' using message = 'Complete your public profile URL first';
  end if;
end;
$$;

revoke all on function public.assert_own_onboarding_prerequisites(uuid, text) from public, anon, authenticated, service_role;

create or replace function public.advance_own_onboarding_progress(p_step text)
returns public.onboarding_progress
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_steps text[] := array['identity', 'contact', 'content', 'address', 'preview']::text[];
  v_step_index integer := pg_catalog.array_position(v_steps, p_step);
  v_progress public.onboarding_progress%rowtype;
  v_expected_index integer;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  if v_step_index is null then
    raise sqlstate '22023' using message = 'Invalid onboarding step';
  end if;

  insert into public.onboarding_progress (owner_id)
  values (v_owner_id)
  on conflict (owner_id) do nothing;

  select onboarding_progress.*
  into strict v_progress
  from public.onboarding_progress
  where onboarding_progress.owner_id = v_owner_id
  for update;

  if p_step = any(v_progress.completed_steps) then
    return v_progress;
  end if;

  v_expected_index := pg_catalog.cardinality(v_progress.completed_steps) + 1;
  if v_step_index <> v_expected_index then
    raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
  end if;

  perform public.assert_own_onboarding_prerequisites(v_owner_id, p_step);

  update public.onboarding_progress
  set
    current_step = case
      when v_step_index < pg_catalog.cardinality(v_steps) then v_steps[v_step_index + 1]
      else 'publish'
    end,
    completed_steps = v_steps[1:v_step_index],
    completed_at = null
  where onboarding_progress.owner_id = v_owner_id
  returning onboarding_progress.* into strict v_progress;

  return v_progress;
end;
$$;

revoke all on function public.advance_own_onboarding_progress(text) from public, anon, service_role;
grant execute on function public.advance_own_onboarding_progress(text) to authenticated;

create or replace function public.complete_own_onboarding_publish(p_publish boolean)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_completed_steps text[];
  v_has_progress boolean;
  v_has_claimed_registration boolean;
  v_updated_profiles integer;
  v_slug text;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  if p_publish is null then
    raise sqlstate '22004' using message = 'Publication choice is required';
  end if;

  select onboarding_progress.completed_steps
  into v_completed_steps
  from public.onboarding_progress
  where onboarding_progress.owner_id = v_owner_id
  for update;
  v_has_progress := found;

  select exists (
    select 1
    from public.registration_intents
    where registration_intents.owner_id = v_owner_id
      and registration_intents.status = 'claimed'
  ) into v_has_claimed_registration;

  if v_has_progress then
    if not (
      array['identity', 'contact', 'content', 'address', 'preview']::text[] <@ v_completed_steps
    ) then
      raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
    end if;
  elsif v_has_claimed_registration then
    raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
  end if;

  if v_has_progress then
    perform public.assert_own_onboarding_prerequisites(v_owner_id, 'preview');
  end if;

  update public.profiles
  set
    status = case when p_publish then 'published' else 'draft' end,
    published_at = case when p_publish then pg_catalog.now() else null end
  where profiles.owner_id = v_owner_id
  returning profiles.slug into v_slug;

  get diagnostics v_updated_profiles = row_count;
  if v_updated_profiles <> 1 then
    raise sqlstate 'P0002' using message = 'Profile not found';
  end if;

  -- A legacy profile has neither a row nor a service-role claim and retains
  -- legacy publishing behavior. Once published, it becomes a completed v2 row.
  if v_has_progress or p_publish then
    insert into public.onboarding_progress (
      owner_id,
      current_step,
      completed_steps,
      completed_at
    ) values (
      v_owner_id,
      'publish',
      array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[],
      pg_catalog.now()
    )
    on conflict (owner_id) do update
    set
      current_step = 'publish',
      completed_steps = array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[],
      completed_at = pg_catalog.now();
  end if;

  return v_slug;
end;
$$;

revoke all on function public.complete_own_onboarding_publish(boolean) from public, anon, service_role;
grant execute on function public.complete_own_onboarding_publish(boolean) to authenticated;

create or replace function public.unpublish_own_profile()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_slug text;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  update public.profiles
  set status = 'draft', published_at = null
  where profiles.owner_id = v_owner_id
  returning profiles.slug into v_slug;

  if not found then
    raise sqlstate 'P0002' using message = 'Profile not found';
  end if;

  return v_slug;
end;
$$;

revoke all on function public.unpublish_own_profile() from public, anon, service_role;
grant execute on function public.unpublish_own_profile() to authenticated;

create or replace function public.admin_set_profile_publication(
  p_profile_id uuid,
  p_publish boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid;
  v_slug text;
begin
  if p_profile_id is null or p_publish is null then
    raise sqlstate '22004' using message = 'Profile and publication choice are required';
  end if;

  select profiles.owner_id, profiles.slug
  into v_owner_id, v_slug
  from public.profiles
  where profiles.id = p_profile_id
  for update;

  if not found then
    raise sqlstate 'P0002' using message = 'Profile not found';
  end if;

  update public.profiles
  set
    status = case when p_publish then 'published' else 'draft' end,
    published_at = case when p_publish then pg_catalog.now() else null end
  where profiles.id = p_profile_id;

  -- An administrator explicitly overrides the normal prerequisites and records
  -- a completed journey in the same transaction. Unpublish only revokes access.
  if p_publish then
    insert into public.onboarding_progress (
      owner_id,
      current_step,
      completed_steps,
      completed_at
    ) values (
      v_owner_id,
      'publish',
      array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[],
      pg_catalog.now()
    )
    on conflict (owner_id) do update
    set
      current_step = 'publish',
      completed_steps = array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[],
      completed_at = pg_catalog.now();
  end if;

  return v_slug;
end;
$$;

revoke all on function public.admin_set_profile_publication(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_profile_publication(uuid, boolean) to service_role;
