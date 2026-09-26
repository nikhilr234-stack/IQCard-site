-- Creates a complete unclaimed gift in one transaction. The service-role-only
-- RPC is called only by an admin-authorized server action; recipients never
-- receive access to private claim data or internal media object paths.
-- Keep Gift Factory self-contained on production installs that never applied
-- the older publication-boundary migrations.
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

create or replace function public.admin_create_and_publish_gift_profile(
  p_profile_id uuid,
  p_full_name text,
  p_recipient_email text,
  p_role text,
  p_tagline text,
  p_phone text,
  p_whatsapp text,
  p_location text,
  p_photo_path text,
  p_cover_path text,
  p_links jsonb
)
returns table(profile_id uuid, slug text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_recipient_email, '')));
  v_role text := pg_catalog.btrim(coalesce(p_role, ''));
  v_tagline text := pg_catalog.btrim(coalesce(p_tagline, ''));
  v_phone text := pg_catalog.btrim(coalesce(p_phone, ''));
  v_whatsapp text := pg_catalog.btrim(coalesce(p_whatsapp, ''));
  v_location text := pg_catalog.btrim(coalesce(p_location, ''));
  v_slug_root text;
  v_slug text;
  v_attempt integer;
  v_constraint text;
  v_link record;
  v_presentation jsonb;
begin
  if p_profile_id is null
    or pg_catalog.cardinality(pg_catalog.regexp_split_to_array(v_full_name, '\s+')) < 2
    or pg_catalog.length(pg_catalog.split_part(v_full_name, ' ', 1)) > 80
    or pg_catalog.length(pg_catalog.btrim(pg_catalog.substr(v_full_name, pg_catalog.strpos(v_full_name, ' ')))) > 80
    or pg_catalog.lower(v_full_name) = 'your name'
    or pg_catalog.length(v_full_name) > 161
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or v_role = ''
    or pg_catalog.length(v_role) > 120
    or pg_catalog.length(v_tagline) > 500
    or (v_phone <> '' and (v_phone !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 7 and 15))
    or (v_whatsapp <> '' and (v_whatsapp !~ '^[+0-9][0-9[:space:]().-]+$' or pg_catalog.length(pg_catalog.regexp_replace(v_whatsapp, '[^0-9]', '', 'g')) not between 7 and 15))
    or pg_catalog.length(v_location) > 120 then
    raise sqlstate '22023' using message = 'Valid gift name, recipient email, role, and optional details are required';
  end if;

  if p_links is null or pg_catalog.jsonb_typeof(p_links) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_links) > 12 then
    raise sqlstate '22023' using message = 'Gift links are invalid';
  end if;

  if (p_photo_path is not null and p_photo_path not like 'gift/' || p_profile_id::text || '/%')
    or (p_cover_path is not null and p_cover_path not like 'gift/' || p_profile_id::text || '/%') then
    raise sqlstate '22023' using message = 'Gift media path is invalid';
  end if;

  v_slug_root := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.lower(v_full_name), '[^a-z0-9]+', '-', 'g'), '-');
  if v_slug_root = '' then v_slug_root := 'gift'; end if;
  if v_slug_root in ('admin','api','auth','dashboard','login','iq','register','onboarding','customize','claim-gift') then
    v_slug_root := v_slug_root || '-gift';
  end if;

  -- Serialize generated slugs for the same normalized name. The unique index
  -- remains the final guard against other profile-creation paths.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gift-profile-slug:' || v_slug_root, 0));
  for v_attempt in 1..100 loop
    v_slug := case when v_attempt = 1 then v_slug_root else v_slug_root || '-' || v_attempt::text end;
    begin
      insert into public.profiles (
        id, owner_id, slug, status, full_name, headline, tagline, email,
        phone, whatsapp, location, photo_path
      ) values (
        p_profile_id, null, v_slug, 'draft', v_full_name, v_role, v_tagline, '',
        v_phone, v_whatsapp, v_location, p_photo_path
      );
      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;
      if v_constraint is distinct from 'profiles_slug_key' then raise; end if;
      if v_attempt = 100 then
        raise sqlstate '23505' using message = 'Unable to allocate a unique gift URL';
      end if;
    end;
  end loop;

  insert into public.profile_gift_claims (profile_id, recipient_email, recipient_name)
  values (p_profile_id, v_email, v_full_name);

  v_presentation := pg_catalog.jsonb_build_object(
    'template', 'cover',
    'cover', pg_catalog.jsonb_build_object(
      'coverPath', p_cover_path,
      'overlay', 0.38,
      'focalY', 50,
      'alignment', 'center',
      'photoPathOverride', p_photo_path
    )
  );
  insert into public.profile_presentations (profile_id, draft, published)
  values (p_profile_id, v_presentation, v_presentation);

  for v_link in
    select item.value, item.ordinality
    from pg_catalog.jsonb_array_elements(p_links) with ordinality as item(value, ordinality)
  loop
    if pg_catalog.jsonb_typeof(v_link.value) is distinct from 'object'
      or pg_catalog.jsonb_typeof(v_link.value -> 'label') is distinct from 'string'
      or pg_catalog.jsonb_typeof(v_link.value -> 'url') is distinct from 'string'
      or not public.is_valid_profile_link(v_link.value ->> 'label', v_link.value ->> 'url') then
      raise sqlstate '22023' using message = 'Gift links are invalid';
    end if;
    insert into public.profile_links (profile_id, label, url, sort_order)
    values (p_profile_id, pg_catalog.btrim(v_link.value ->> 'label'), pg_catalog.btrim(v_link.value ->> 'url'), (v_link.ordinality - 1)::integer);
  end loop;

  -- Link validation above is explicit and self-contained; any failure rolls
  -- back all writes in this function call.
  update public.profiles
  set status = 'published', published_at = pg_catalog.now()
  where id = p_profile_id;

  return query select p_profile_id, v_slug;
end;
$$;

revoke all on function public.admin_create_and_publish_gift_profile(uuid, text, text, text, text, text, text, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_create_and_publish_gift_profile(uuid, text, text, text, text, text, text, text, text, text, jsonb)
  to service_role;
