-- Follow-up for installations that already applied 202609080001.
-- PostgreSQL standard strings use a single backslash for regex escapes.
-- New authenticated drafts must be a v2 enrollment. Raw inserts would be
-- indistinguishable from historical rows (which intentionally retain legacy
-- publishing behavior), so only the owner-bound RPC below can create one.
drop policy if exists "owners create their profile" on public.profiles;
revoke all privileges on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (
  slug, full_name, headline, tagline, bio, phone, email, photo_path,
  whatsapp, location, public_email_visible, phone_visible,
  whatsapp_visible, location_visible
) on table public.profiles to authenticated;

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

-- Administrative provisioning creates the same explicit v2 enrollment, while
-- retaining a separate service-role-only boundary for operational tooling.
create or replace function public.admin_create_profile_draft(
  p_owner_id uuid, p_slug text, p_full_name text, p_email text
)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype;
begin
  if p_owner_id is null or pg_catalog.btrim(p_slug) = '' then raise sqlstate '22023' using message = 'Profile owner and URL are required'; end if;
  if p_slug in ('admin','api','auth','dashboard','login','iq','register','onboarding','customize') or p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise sqlstate '22023' using message = 'Invalid profile URL'; end if;
  if pg_catalog.btrim(p_email) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise sqlstate '22023' using message = 'Invalid email'; end if;

  insert into public.profiles (owner_id, slug, full_name, email)
  values (p_owner_id, p_slug, pg_catalog.btrim(p_full_name), pg_catalog.lower(pg_catalog.btrim(p_email)))
  on conflict (owner_id) do nothing
  returning profiles.* into v_profile;
  if not found then
    select profiles.* into strict v_profile from public.profiles where profiles.owner_id = p_owner_id;
    return v_profile;
  end if;
  insert into public.onboarding_progress (owner_id) values (p_owner_id) on conflict (owner_id) do nothing;
  return v_profile;
end; $$;
revoke all on function public.admin_create_profile_draft(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_create_profile_draft(uuid, text, text, text) to service_role;

create or replace function public.assert_own_onboarding_prerequisites(p_owner_id uuid, p_target_step text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype;
begin
  select profiles.* into strict v_profile from public.profiles where profiles.owner_id = p_owner_id for update;
  if p_target_step in ('identity', 'contact', 'content', 'address', 'preview', 'publish')
    and pg_catalog.cardinality(pg_catalog.regexp_split_to_array(pg_catalog.btrim(v_profile.full_name), '\s+')) < 2 then
    raise sqlstate 'P0001' using message = 'Complete your identity first';
  end if;
  if p_target_step in ('contact', 'content', 'address', 'preview', 'publish') and (
    (v_profile.email <> '' and v_profile.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (v_profile.phone <> '' and (v_profile.phone !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_profile.phone, '[^0-9]', '', 'g')) not between 7 and 15))
    or (v_profile.whatsapp <> '' and (v_profile.whatsapp !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_profile.whatsapp, '[^0-9]', '', 'g')) not between 7 and 15))
    or pg_catalog.length(v_profile.location) > 120
  ) then raise sqlstate 'P0001' using message = 'Complete your contact details first'; end if;
  if p_target_step in ('content', 'address', 'preview', 'publish') and (
    (select pg_catalog.count(*) from public.profile_links where profile_links.profile_id = v_profile.id) > 12
    or exists (
    select 1 from public.profile_links where profile_links.profile_id = v_profile.id and
    (pg_catalog.length(pg_catalog.btrim(profile_links.label)) not between 1 and 60
      or pg_catalog.btrim(profile_links.url) !~* '^(https://[^[:space:]/?#]+(?:/[^[:space:]]*)?|mailto:[^[:space:]]+|tel:[+0-9][0-9[:space:]().-]+)$')
  )
    or exists (
      select 1 from (
        select profile_links.sort_order, pg_catalog.row_number() over (order by profile_links.sort_order, profile_links.id) - 1 as expected_order
        from public.profile_links where profile_links.profile_id = v_profile.id
      ) ordered_links where ordered_links.sort_order <> ordered_links.expected_order
    )
  ) then raise sqlstate 'P0001' using message = 'Complete your profile links first'; end if;
  if p_target_step in ('address', 'preview', 'publish') and (v_profile.slug in ('admin','api','auth','dashboard','login','iq','register','onboarding','customize') or v_profile.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') then
    raise sqlstate 'P0001' using message = 'Complete your public profile URL first';
  end if;
end; $$;
revoke all on function public.assert_own_onboarding_prerequisites(uuid, text) from public, anon, authenticated, service_role;

-- Raw profile-link writes would let a caller create invalid persisted content.
-- This is intentionally shared by the replacement RPC and publication guard so
-- direct persistence cannot create a link the later publication boundary would
-- interpret differently. It mirrors the browser validator's HTTP(S), mailto,
-- and tel forms without relying on a permissive protocol-prefix check. IPv6
-- literals and percent-bearing hosts are intentionally unsupported: a normal
-- domain/IPv4 host is safer than a partial IPv6 regex parser.
create or replace function public.decode_profile_link_percent(p_value text)
returns text language plpgsql immutable strict security invoker set search_path = '' as $$
declare
  v_result text := '';
  v_index integer := 1;
  v_hex text;
  v_byte integer;
begin
  if pg_catalog.length(p_value) > 2048 then return null; end if;

  while v_index <= pg_catalog.length(p_value) loop
    if pg_catalog.substr(p_value, v_index, 1) = '%' then
      if v_index + 2 > pg_catalog.length(p_value) then return null; end if;
      v_hex := pg_catalog.substr(p_value, v_index + 1, 2);
      if v_hex !~ '^[0-9A-Fa-f]{2}$' then return null; end if;
      v_byte := pg_catalog.get_byte(pg_catalog.decode(v_hex, 'hex'), 0);
      if v_byte > 127 then return null; end if;
      v_result := v_result || pg_catalog.chr(v_byte);
      v_index := v_index + 3;
    else
      v_result := v_result || pg_catalog.substr(p_value, v_index, 1);
      v_index := v_index + 1;
    end if;
  end loop;

  return v_result;
end;
$$;
revoke all on function public.decode_profile_link_percent(text) from public, anon, authenticated, service_role;

create or replace function public.is_valid_profile_link(p_label text, p_url text)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare
  v_url text := pg_catalog.btrim(coalesce(p_url, ''));
  v_match text[];
  v_host text;
  v_mailto_path text;
  v_decoded_mailto text;
begin
  if pg_catalog.length(pg_catalog.btrim(coalesce(p_label, ''))) not between 1 and 60
    or pg_catalog.length(v_url) not between 1 and 2048 then return false; end if;

  v_match := pg_catalog.regexp_match(v_url, '^https?://([a-z0-9.-]+)(?::(?:[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5]))?(?:[/?#][^[:space:]]*)?$', 'i');
  if v_match is not null then
    v_host := v_match[1];
    if pg_catalog.length(v_host) > 253 then return false; end if;
    if v_host ~ '^[0-9.]+$' then
      return v_host ~ '^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$';
    end if;
    return v_host ~ '^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$';
  end if;

  if v_url ~* '^mailto:[^[:space:]?]+(?:\?[^[:space:]]*)?$' then
    v_mailto_path := pg_catalog.split_part(pg_catalog.substr(v_url, 8), '?', 1);
    v_decoded_mailto := public.decode_profile_link_percent(v_mailto_path);
    return v_decoded_mailto is not null
      and v_decoded_mailto ~* '^[^[:space:]@?]+@[^[:space:]@?]+\.[^[:space:]@?]+$';
  end if;

  return v_url ~* '^tel:[+0-9][0-9[:space:]().-]+$'
    and pg_catalog.length(pg_catalog.regexp_replace(pg_catalog.substr(v_url, 5), '[^0-9]', '', 'g')) between 7 and 15;
end;
$$;
revoke all on function public.is_valid_profile_link(text, text) from public, anon, authenticated, service_role;

drop policy if exists "owners manage profile links" on public.profile_links;
drop policy if exists "owners read their profile links" on public.profile_links;
create policy "owners read their profile links" on public.profile_links for select to authenticated using (
  exists (select 1 from public.profiles where profiles.id = profile_links.profile_id and profiles.owner_id = auth.uid())
);
revoke all privileges on table public.profile_links from authenticated;
grant select on table public.profile_links to authenticated;

create or replace function public.replace_own_profile_links(p_links jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_owner_id uuid := auth.uid(); v_profile_id uuid;
begin
  if v_owner_id is null then raise sqlstate '42501' using message = 'Authentication required'; end if;
  if p_links is null or pg_catalog.jsonb_typeof(p_links) <> 'array' or pg_catalog.jsonb_array_length(p_links) > 12 then raise sqlstate '22023' using message = 'Invalid links'; end if;
  if exists (select 1 from pg_catalog.jsonb_array_elements(p_links) link(value) where pg_catalog.jsonb_typeof(link.value) <> 'object' or not public.is_valid_profile_link(link.value->>'label', link.value->>'url')) then raise sqlstate '22023' using message = 'Invalid links'; end if;
  select profiles.id into strict v_profile_id from public.profiles where profiles.owner_id = v_owner_id for update;
  delete from public.profile_links where profile_links.profile_id = v_profile_id;
  insert into public.profile_links (profile_id,label,url,sort_order) select v_profile_id, link.value->>'label', link.value->>'url', (link.ordinality-1)::integer from pg_catalog.jsonb_array_elements(p_links) with ordinality as link(value, ordinality);
end; $$;
revoke all on function public.replace_own_profile_links(jsonb) from public, anon, service_role;
grant execute on function public.replace_own_profile_links(jsonb) to authenticated;

-- Re-declare publication here so this follow-up remains self-contained: v2
-- drafts created above always have a progress row, while truly pre-existing
-- rows with neither a row nor a claimed registration retain legacy support.
create or replace function public.complete_own_onboarding_publish(p_publish boolean)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_owner_id uuid := auth.uid(); v_completed_steps text[]; v_has_progress boolean;
  v_has_claimed_registration boolean; v_updated_profiles integer; v_slug text;
begin
  if v_owner_id is null then raise sqlstate '42501' using message = 'Authentication required'; end if;
  if p_publish is null then raise sqlstate '22004' using message = 'Publication choice is required'; end if;
  select onboarding_progress.completed_steps into v_completed_steps from public.onboarding_progress where onboarding_progress.owner_id = v_owner_id for update;
  v_has_progress := found;
  select exists (select 1 from public.registration_intents where registration_intents.owner_id = v_owner_id and registration_intents.status = 'claimed') into v_has_claimed_registration;
  if v_has_progress then
    if not (array['identity', 'contact', 'content', 'address', 'preview']::text[] <@ v_completed_steps) then raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first'; end if;
  elsif v_has_claimed_registration then
    raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
  end if;
  if p_publish then perform public.assert_own_onboarding_prerequisites(v_owner_id, 'publish'); end if;
  update public.profiles set status = case when p_publish then 'published' else 'draft' end, published_at = case when p_publish then pg_catalog.now() else null end where profiles.owner_id = v_owner_id returning profiles.slug into v_slug;
  get diagnostics v_updated_profiles = row_count;
  if v_updated_profiles <> 1 then raise sqlstate 'P0002' using message = 'Profile not found'; end if;
  if v_has_progress or p_publish then
    insert into public.onboarding_progress (owner_id, current_step, completed_steps, completed_at)
    values (v_owner_id, 'publish', array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[], pg_catalog.now())
    on conflict (owner_id) do update set current_step = 'publish', completed_steps = array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[], completed_at = pg_catalog.now();
  end if;
  return v_slug;
end; $$;
revoke all on function public.complete_own_onboarding_publish(boolean) from public, anon, service_role;
grant execute on function public.complete_own_onboarding_publish(boolean) to authenticated;

-- Validate an explicit profile image as well as its persisted links. The
-- trigger must pass NEW here: selecting the stored row during a BEFORE UPDATE
-- would validate the old values and let an invalid published edit slip through.
create or replace function public.assert_profile_publication_prerequisites(
  p_profile public.profiles, p_target_step text
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_normalized_name text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_profile.full_name, '')), '\s+', ' ', 'g');
  v_name_parts text[];
begin
  v_name_parts := pg_catalog.regexp_split_to_array(v_normalized_name, ' ');
  if p_target_step in ('identity', 'contact', 'content', 'address', 'preview', 'publish')
    and (
      pg_catalog.cardinality(v_name_parts) < 2
      or pg_catalog.length(v_name_parts[1]) > 80
      or pg_catalog.length(pg_catalog.array_to_string(v_name_parts[2:pg_catalog.array_length(v_name_parts, 1)], ' ')) > 80
      or pg_catalog.lower(v_normalized_name) = 'your name'
    ) then
    raise sqlstate 'P0001' using message = 'Complete your identity first';
  end if;
  if p_target_step in ('contact', 'content', 'address', 'preview', 'publish') and (
    (p_profile.email <> '' and p_profile.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (p_profile.phone <> '' and (p_profile.phone !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(p_profile.phone, '[^0-9]', '', 'g')) not between 7 and 15))
    or (p_profile.whatsapp <> '' and (p_profile.whatsapp !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(p_profile.whatsapp, '[^0-9]', '', 'g')) not between 7 and 15))
    or pg_catalog.length(p_profile.location) > 120
  ) then raise sqlstate 'P0001' using message = 'Complete your contact details first'; end if;
  if p_target_step in ('content', 'address', 'preview', 'publish') and (
    pg_catalog.length(p_profile.headline) > 120
    or pg_catalog.length(p_profile.bio) > 500
  ) then raise sqlstate 'P0001' using message = 'Complete your profile content first'; end if;
  if p_target_step in ('content', 'address', 'preview', 'publish') and (
    (select pg_catalog.count(*) from public.profile_links where profile_links.profile_id = p_profile.id) > 12
    or exists (select 1 from public.profile_links where profile_links.profile_id = p_profile.id and not public.is_valid_profile_link(profile_links.label, profile_links.url))
    or exists (select 1 from (
      select profile_links.sort_order, pg_catalog.row_number() over (order by profile_links.sort_order, profile_links.id) - 1 as expected_order
      from public.profile_links where profile_links.profile_id = p_profile.id
    ) ordered_links where ordered_links.sort_order <> ordered_links.expected_order)
  ) then raise sqlstate 'P0001' using message = 'Complete your profile links first'; end if;
  if p_target_step in ('address', 'preview', 'publish') and (
    p_profile.slug in ('admin','api','auth','dashboard','login','iq','register','onboarding','customize')
    or p_profile.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) then raise sqlstate 'P0001' using message = 'Complete your public profile URL first'; end if;
end; $$;
revoke all on function public.assert_profile_publication_prerequisites(public.profiles, text) from public, anon, authenticated, service_role;

create or replace function public.assert_own_onboarding_prerequisites(p_owner_id uuid, p_target_step text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_profile public.profiles%rowtype;
begin
  select profiles.* into strict v_profile from public.profiles where profiles.owner_id = p_owner_id for update;
  perform public.assert_profile_publication_prerequisites(v_profile, p_target_step);
end; $$;
revoke all on function public.assert_own_onboarding_prerequisites(uuid, text) from public, anon, authenticated, service_role;

-- A published row must remain publication-valid after every ordinary edit.
create or replace function public.enforce_published_profile_validity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'published' then perform public.assert_profile_publication_prerequisites(new, 'publish'); end if;
  return new;
end; $$;
drop trigger if exists enforce_published_profile_validity on public.profiles;
create trigger enforce_published_profile_validity before update on public.profiles for each row execute procedure public.enforce_published_profile_validity();
