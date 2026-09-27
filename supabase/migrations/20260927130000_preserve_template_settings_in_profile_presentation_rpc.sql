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
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;

  if p_draft is null
    or pg_catalog.jsonb_typeof(p_draft) is distinct from 'object'
    or coalesce(p_draft ->> 'template', '') not in ('minimal', 'cover', 'studio', 'executive', 'signal', 'index')
    or pg_catalog.jsonb_typeof(p_draft -> 'cover') is distinct from 'object'
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
    or (p_draft ? 'templateSettings' and pg_catalog.octet_length((p_draft -> 'templateSettings')::text) > 16384) then
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
