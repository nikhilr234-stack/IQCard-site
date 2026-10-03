create or replace function public.save_own_profile_presentation(p_draft jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_profile_id uuid;
  v_cover_path text;
  v_photo_path_override text;
  v_canonical_draft jsonb;
  v_whats_next jsonb;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  if p_draft is null
    or pg_catalog.jsonb_typeof(p_draft) is distinct from 'object'
    or coalesce(p_draft ->> 'template', '') not in ('minimal', 'cover', 'studio', 'executive', 'signal', 'index')
    or pg_catalog.jsonb_typeof(p_draft -> 'cover') is distinct from 'object'
    or (p_draft #> '{cover,backgroundEnabled}' is not null
      and pg_catalog.jsonb_typeof(p_draft #> '{cover,backgroundEnabled}') is distinct from 'boolean')
    or coalesce(pg_catalog.jsonb_typeof(p_draft #> '{cover,coverPath}'), '') not in ('string', 'null')
    or coalesce(pg_catalog.jsonb_typeof(p_draft #> '{cover,photoPathOverride}'), '') not in ('string', 'null')
    or pg_catalog.jsonb_typeof(p_draft #> '{cover,overlay}') is distinct from 'number'
    or pg_catalog.jsonb_typeof(p_draft #> '{cover,focalY}') is distinct from 'number'
    or coalesce(p_draft #>> '{cover,alignment}', '') not in ('lower-left', 'center')
    or (case when pg_catalog.jsonb_typeof(p_draft #> '{cover,overlay}') = 'number'
      then (p_draft #>> '{cover,overlay}')::numeric not between 0.15 and 0.70 else true end)
    or (case when pg_catalog.jsonb_typeof(p_draft #> '{cover,focalY}') = 'number'
      then (p_draft #>> '{cover,focalY}')::numeric not between 0 and 100 else true end)
    or (p_draft ? 'design' and pg_catalog.jsonb_typeof(p_draft -> 'design') is distinct from 'object')
    or (p_draft ? 'design' and pg_catalog.octet_length((p_draft -> 'design')::text) > 16384)
    or (p_draft ? 'templateSettings' and pg_catalog.jsonb_typeof(p_draft -> 'templateSettings') is distinct from 'object')
    or (p_draft ? 'templateSettings' and pg_catalog.octet_length((p_draft -> 'templateSettings')::text) > 16384)
    or (p_draft ? 'whatsNext' and pg_catalog.jsonb_typeof(p_draft -> 'whatsNext') is distinct from 'array')
    or (case when pg_catalog.jsonb_typeof(p_draft -> 'whatsNext') = 'array'
      then pg_catalog.jsonb_array_length(p_draft -> 'whatsNext') > 3 else false end)
    or exists (
      select 1
      from pg_catalog.jsonb_array_elements(
        case when pg_catalog.jsonb_typeof(p_draft -> 'whatsNext') = 'array'
          then p_draft -> 'whatsNext' else '[]'::jsonb end
      ) as item(value)
      where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
        or pg_catalog.jsonb_typeof(item.value -> 'title') is distinct from 'string'
        or pg_catalog.length(pg_catalog.btrim(item.value ->> 'title')) not between 1 and 80
        or pg_catalog.jsonb_typeof(item.value -> 'description') is distinct from 'string'
        or pg_catalog.length(pg_catalog.btrim(item.value ->> 'description')) not between 1 and 240
        or (item.value ? 'date' and pg_catalog.jsonb_typeof(item.value -> 'date') is distinct from 'string')
        or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'date', ''))) > 80
        or (item.value ? 'url' and pg_catalog.jsonb_typeof(item.value -> 'url') is distinct from 'string')
        or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'url', ''))) > 2048
        or (pg_catalog.btrim(coalesce(item.value ->> 'url', '')) <> ''
          and not public.is_valid_profile_link('Next', item.value ->> 'url'))
    ) then
    raise sqlstate '22023' using message = 'Invalid presentation settings';
  end if;

  v_cover_path := p_draft #>> '{cover,coverPath}';
  v_photo_path_override := p_draft #>> '{cover,photoPathOverride}';
  if (v_cover_path is not null and v_cover_path not like v_owner_id::text || '/%')
    or (v_photo_path_override is not null and v_photo_path_override not like v_owner_id::text || '/%') then
    raise sqlstate '22023' using message = 'Presentation media must belong to the authenticated owner';
  end if;

  v_canonical_draft := pg_catalog.jsonb_build_object(
    'template', p_draft -> 'template',
    'cover', pg_catalog.jsonb_build_object(
      'coverPath', p_draft #> '{cover,coverPath}',
      'backgroundEnabled', pg_catalog.to_jsonb(coalesce(
        (p_draft #>> '{cover,backgroundEnabled}')::boolean,
        (p_draft ->> 'template') = 'cover'
      )),
      'overlay', p_draft #> '{cover,overlay}',
      'focalY', p_draft #> '{cover,focalY}',
      'alignment', p_draft #> '{cover,alignment}',
      'photoPathOverride', p_draft #> '{cover,photoPathOverride}'
    )
  );

  if p_draft ? 'design' then
    v_canonical_draft := v_canonical_draft || pg_catalog.jsonb_build_object('design', p_draft -> 'design');
  end if;

  if p_draft ? 'templateSettings' then
    v_canonical_draft := v_canonical_draft || pg_catalog.jsonb_build_object('templateSettings', p_draft -> 'templateSettings');
  end if;

  if p_draft ? 'whatsNext' then
    select coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'title', pg_catalog.btrim(item.value ->> 'title'),
          'description', pg_catalog.btrim(item.value ->> 'description'),
          'date', pg_catalog.btrim(coalesce(item.value ->> 'date', '')),
          'url', pg_catalog.btrim(coalesce(item.value ->> 'url', ''))
        ) order by item.ordinality
      ),
      '[]'::jsonb
    )
    into v_whats_next
    from pg_catalog.jsonb_array_elements(p_draft -> 'whatsNext') with ordinality as item(value, ordinality);

    v_canonical_draft := v_canonical_draft || pg_catalog.jsonb_build_object('whatsNext', v_whats_next);
  end if;

  select profiles.id
  into strict v_profile_id
  from public.profiles
  where profiles.owner_id = v_owner_id
  for update;

  insert into public.profile_presentations (profile_id, draft)
  values (v_profile_id, v_canonical_draft)
  on conflict (profile_id) do update
  set draft = excluded.draft;
end;
$$;

revoke all on function public.save_own_profile_presentation(jsonb) from public, anon, service_role;
grant execute on function public.save_own_profile_presentation(jsonb) to authenticated;

create or replace function public.is_published_profile_cover(p_path text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profile_presentations
    join public.profiles on profiles.id = profile_presentations.profile_id
    where profiles.status = 'published'
      and profile_presentations.published #>> '{cover,coverPath}' = p_path
      and (
        profile_presentations.published #>> '{cover,backgroundEnabled}' = 'true'
        or (
          profile_presentations.published #> '{cover,backgroundEnabled}' is null
          and profile_presentations.published ->> 'template' = 'cover'
        )
      )
  );
$$;

revoke all on function public.is_published_profile_cover(text) from public, anon, authenticated, service_role;
grant execute on function public.is_published_profile_cover(text) to anon, authenticated;
