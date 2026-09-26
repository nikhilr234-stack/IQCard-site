-- Update the supplied details on an unclaimed gift without touching its media
-- object paths or changing its claim ownership.
create or replace function public.admin_update_unclaimed_gift_profile(
  p_profile_id uuid,
  p_full_name text,
  p_role text,
  p_tagline text,
  p_phone text,
  p_whatsapp text,
  p_location text,
  p_links jsonb
)
returns table(slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  v_link record;
  v_claim public.profile_gift_claims%rowtype;
  v_profile public.profiles%rowtype;
  v_presentation jsonb;
begin
  if p_profile_id is null or pg_catalog.length(v_name) < 3 or pg_catalog.length(v_name) > 161
    or pg_catalog.btrim(coalesce(p_role, '')) = '' or pg_catalog.length(pg_catalog.btrim(p_role)) > 120
    or pg_catalog.length(pg_catalog.btrim(coalesce(p_tagline, ''))) > 500
    or pg_catalog.length(pg_catalog.btrim(coalesce(p_location, ''))) > 120
    or (coalesce(p_phone, '') <> '' and (p_phone !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(p_phone, '[^0-9]', '', 'g')) not between 7 and 15))
    or (coalesce(p_whatsapp, '') <> '' and (p_whatsapp !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(p_whatsapp, '[^0-9]', '', 'g')) not between 7 and 15))
    or p_links is null or pg_catalog.jsonb_typeof(p_links) is distinct from 'array' or pg_catalog.jsonb_array_length(p_links) > 12 then
    raise sqlstate '22023' using message = 'Gift profile details are invalid';
  end if;

  select profile_gift_claims.* into strict v_claim from public.profile_gift_claims
  where profile_gift_claims.profile_id = p_profile_id and profile_gift_claims.status = 'unclaimed'
  for update;
  select profiles.* into strict v_profile from public.profiles
  where profiles.id = p_profile_id and profiles.owner_id is null
  for update;

  update public.profiles set full_name = v_name, headline = pg_catalog.btrim(p_role), tagline = pg_catalog.btrim(coalesce(p_tagline, '')),
    phone = pg_catalog.btrim(coalesce(p_phone, '')), whatsapp = pg_catalog.btrim(coalesce(p_whatsapp, '')),
    location = pg_catalog.btrim(coalesce(p_location, '')) where id = p_profile_id;
  update public.profile_gift_claims set recipient_name = v_name where profile_id = p_profile_id and status = 'unclaimed';

  select published into strict v_presentation from public.profile_presentations where profile_id = p_profile_id for update;
  update public.profile_presentations set draft = v_presentation, published = v_presentation where profile_id = p_profile_id;
  delete from public.profile_links where profile_id = p_profile_id;
  for v_link in select item.value, item.ordinality from pg_catalog.jsonb_array_elements(p_links) with ordinality as item(value, ordinality) loop
    if pg_catalog.jsonb_typeof(v_link.value) is distinct from 'object'
      or pg_catalog.jsonb_typeof(v_link.value -> 'label') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_link.value -> 'url') is distinct from 'string'
      or not public.is_valid_profile_link(v_link.value ->> 'label', v_link.value ->> 'url') then
      raise sqlstate '22023' using message = 'Gift links are invalid';
    end if;
    insert into public.profile_links (profile_id, label, url, sort_order)
    values (p_profile_id, pg_catalog.btrim(v_link.value ->> 'label'), pg_catalog.btrim(v_link.value ->> 'url'), (v_link.ordinality - 1)::integer);
  end loop;
  return query select v_profile.slug;
end;
$$;

revoke all on function public.admin_update_unclaimed_gift_profile(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.admin_update_unclaimed_gift_profile(uuid, text, text, text, text, text, text, jsonb) to service_role;
