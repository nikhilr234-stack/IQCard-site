-- Restore the owner-only profile editing boundary and make the Digital Profile
-- editor's single save atomic across details, links, and presentation.

drop policy if exists "owners create their profile" on public.profiles;
revoke all privileges on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (
  slug, full_name, headline, tagline, bio, phone, email, photo_path,
  whatsapp, location, public_email_visible, phone_visible,
  whatsapp_visible, location_visible
) on table public.profiles to authenticated;

drop policy if exists "owners manage profile links" on public.profile_links;
drop policy if exists "owners read their profile links" on public.profile_links;
revoke all privileges on table public.profile_links from authenticated;
grant select on table public.profile_links to authenticated;
create policy "owners read their profile links" on public.profile_links for select to authenticated using (
  exists (
    select 1 from public.profiles
    where profiles.id = profile_links.profile_id
      and profiles.owner_id = auth.uid()
  )
);

create or replace function public.replace_own_profile_links(p_links jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_profile_id uuid;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  if p_links is null
    or pg_catalog.jsonb_typeof(p_links) <> 'array'
    or pg_catalog.jsonb_array_length(p_links) > 12
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_links) as link(value)
      where pg_catalog.jsonb_typeof(link.value) <> 'object'
        or not public.is_valid_profile_link(link.value->>'label', link.value->>'url')
    ) then
    raise sqlstate '22023' using message = 'Invalid links';
  end if;

  select profiles.id
  into strict v_profile_id
  from public.profiles
  where profiles.owner_id = v_owner_id
  for update;

  delete from public.profile_links where profile_links.profile_id = v_profile_id;
  insert into public.profile_links (profile_id, label, url, sort_order)
  select v_profile_id, link.value->>'label', link.value->>'url', (link.ordinality - 1)::integer
  from pg_catalog.jsonb_array_elements(p_links) with ordinality as link(value, ordinality);
end;
$$;
revoke all on function public.replace_own_profile_links(jsonb) from public, anon, service_role;
grant execute on function public.replace_own_profile_links(jsonb) to authenticated;

create or replace function public.assert_profile_publication_prerequisites(
  p_profile public.profiles,
  p_target_step text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_normalized_name text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_profile.full_name, '')), '\s+', ' ', 'g');
  v_name_parts text[];
begin
  v_name_parts := pg_catalog.regexp_split_to_array(v_normalized_name, ' ');
  if p_target_step in ('identity', 'contact', 'content', 'address', 'preview', 'publish') and (
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
  ) then
    raise sqlstate 'P0001' using message = 'Complete your contact details first';
  end if;

  if p_target_step in ('content', 'address', 'preview', 'publish') and (
    pg_catalog.length(p_profile.headline) > 120
    or pg_catalog.length(p_profile.bio) > 500
  ) then
    raise sqlstate 'P0001' using message = 'Complete your profile content first';
  end if;

  if p_target_step in ('content', 'address', 'preview', 'publish') and (
    (select pg_catalog.count(*) from public.profile_links where profile_links.profile_id = p_profile.id) > 12
    or exists (
      select 1 from public.profile_links
      where profile_links.profile_id = p_profile.id
        and not public.is_valid_profile_link(profile_links.label, profile_links.url)
    )
    or exists (
      select 1
      from (
        select profile_links.sort_order,
          pg_catalog.row_number() over (order by profile_links.sort_order, profile_links.id) - 1 as expected_order
        from public.profile_links
        where profile_links.profile_id = p_profile.id
      ) as ordered_links
      where ordered_links.sort_order <> ordered_links.expected_order
    )
  ) then
    raise sqlstate 'P0001' using message = 'Complete your profile links first';
  end if;

  if p_target_step in ('address', 'preview', 'publish') and (
    p_profile.slug in ('admin', 'api', 'auth', 'dashboard', 'login', 'iq', 'register', 'onboarding', 'customize')
    or p_profile.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ) then
    raise sqlstate 'P0001' using message = 'Complete your public profile URL first';
  end if;
end;
$$;
revoke all on function public.assert_profile_publication_prerequisites(public.profiles, text) from public, anon, authenticated, service_role;

create or replace function public.enforce_published_profile_validity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' then
    perform public.assert_profile_publication_prerequisites(new, 'publish');
  end if;
  return new;
end;
$$;
drop trigger if exists enforce_published_profile_validity on public.profiles;
create trigger enforce_published_profile_validity
before update on public.profiles
for each row execute procedure public.enforce_published_profile_validity();

create or replace function public.save_own_digital_profile(
  p_profile jsonb,
  p_links jsonb,
  p_draft jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_full_name text;
  v_headline text;
  v_bio text;
  v_email text;
  v_phone text;
  v_whatsapp text;
  v_location text;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  if p_profile is null
    or pg_catalog.jsonb_typeof(p_profile) is distinct from 'object'
    or pg_catalog.jsonb_typeof(p_profile->'full_name') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'headline') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'tagline') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'bio') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'email') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'phone') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'whatsapp') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'location') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_profile->'public_email_visible') is distinct from 'boolean'
    or pg_catalog.jsonb_typeof(p_profile->'phone_visible') is distinct from 'boolean'
    or pg_catalog.jsonb_typeof(p_profile->'whatsapp_visible') is distinct from 'boolean'
    or pg_catalog.jsonb_typeof(p_profile->'location_visible') is distinct from 'boolean' then
    raise sqlstate '22023' using message = 'Invalid profile details';
  end if;

  v_full_name := pg_catalog.regexp_replace(pg_catalog.btrim(p_profile->>'full_name'), '\s+', ' ', 'g');
  v_headline := pg_catalog.btrim(p_profile->>'headline');
  v_bio := pg_catalog.btrim(p_profile->>'bio');
  v_email := pg_catalog.lower(pg_catalog.btrim(p_profile->>'email'));
  v_phone := pg_catalog.btrim(p_profile->>'phone');
  v_whatsapp := pg_catalog.btrim(p_profile->>'whatsapp');
  v_location := pg_catalog.btrim(p_profile->>'location');

  if pg_catalog.length(v_full_name) not between 3 and 161
    or pg_catalog.lower(v_full_name) = 'your name'
    or pg_catalog.length(v_headline) > 120
    or pg_catalog.length(pg_catalog.btrim(p_profile->>'tagline')) > 500
    or pg_catalog.length(v_bio) > 500
    or (v_email <> '' and v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
    or (v_phone <> '' and (v_phone !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 15))
    or (v_whatsapp <> '' and (v_whatsapp !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_whatsapp, '[^0-9]', '', 'g')) not between 7 and 15))
    or pg_catalog.length(v_location) > 120 then
    raise sqlstate '22023' using message = 'Check the profile details and try again.';
  end if;

  select profiles.*
  into strict v_profile
  from public.profiles
  where profiles.owner_id = v_owner_id
  for update;

  -- Any failure in this function rolls back all three writes as one unit.
  perform public.replace_own_profile_links(p_links);

  update public.profiles
  set full_name = v_full_name,
    headline = v_headline,
    tagline = pg_catalog.btrim(p_profile->>'tagline'),
    bio = v_bio,
    email = v_email,
    phone = v_phone,
    whatsapp = v_whatsapp,
    location = v_location,
    public_email_visible = (p_profile->>'public_email_visible')::boolean,
    phone_visible = (p_profile->>'phone_visible')::boolean,
    whatsapp_visible = (p_profile->>'whatsapp_visible')::boolean,
    location_visible = (p_profile->>'location_visible')::boolean
  where profiles.id = v_profile.id;

  perform public.save_own_profile_presentation(p_draft);

  if v_profile.status = 'published' then
    perform public.publish_own_profile_presentation();
  end if;

  return v_profile.status = 'published';
end;
$$;
revoke all on function public.save_own_digital_profile(jsonb, jsonb, jsonb) from public, anon, service_role;
grant execute on function public.save_own_digital_profile(jsonb, jsonb, jsonb) to authenticated;
