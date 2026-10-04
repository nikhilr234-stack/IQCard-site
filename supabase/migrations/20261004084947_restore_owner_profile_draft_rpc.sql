-- Restore the missing owner-bound draft RPC on existing production installations.
create or replace function public.create_own_profile_draft(p_full_name text default null)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare
  v_owner_id uuid := auth.uid();
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_full_name text;
  v_slug_root text;
  v_slug text;
  v_attempt integer;
  v_profile public.profiles%rowtype;
begin
  if v_owner_id is null then raise sqlstate '42501' using message = 'Authentication required'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise sqlstate '22023' using message = 'A verified email is required';
  end if;

  select profiles.* into v_profile from public.profiles where profiles.owner_id = v_owner_id for update;
  if found then return v_profile; end if;

  v_full_name := pg_catalog.btrim(coalesce(p_full_name, ''));
  if v_full_name = '' then v_full_name := pg_catalog.split_part(v_email, '@', 1); end if;
  v_slug_root := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.lower(v_full_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug_root = '' then v_slug_root := 'profile'; end if;
  if v_slug_root in ('admin','api','auth','dashboard','login','iq','register','onboarding','customize') then v_slug_root := v_slug_root || '-2'; end if;

  for v_attempt in 1..50 loop
    v_slug := case when v_attempt = 1 then v_slug_root else v_slug_root || '-' || v_attempt::text end;
    begin
      insert into public.profiles (owner_id, slug, full_name, email)
      values (v_owner_id, v_slug, v_full_name, v_email)
      returning profiles.* into strict v_profile;
      insert into public.onboarding_progress (owner_id) values (v_owner_id) on conflict (owner_id) do nothing;
      return v_profile;
    exception when unique_violation then
      select profiles.* into v_profile from public.profiles where profiles.owner_id = v_owner_id;
      if found then return v_profile; end if;
    end;
  end loop;
  raise sqlstate '23505' using message = 'Unable to allocate a profile URL';
end; $$;
revoke all on function public.create_own_profile_draft(text) from public, anon, service_role;
grant execute on function public.create_own_profile_draft(text) to authenticated;

notify pgrst, 'reload schema';
