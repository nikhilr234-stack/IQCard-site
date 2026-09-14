-- Keep persisted profile-link validation aligned with the browser validator.
-- This additive migration updates projects that already applied 202609080002.
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
