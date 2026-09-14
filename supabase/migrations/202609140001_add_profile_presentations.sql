create table public.profile_presentations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  draft jsonb not null default '{"template":"minimal","cover":{}}'::jsonb,
  published jsonb not null default '{"template":"minimal","cover":{}}'::jsonb
);

alter table public.profile_presentations enable row level security;

drop policy if exists "owners read their own profile presentation" on public.profile_presentations;
create policy "owners read their own profile presentation"
on public.profile_presentations for select to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = profile_presentations.profile_id
      and profiles.owner_id = auth.uid()
  )
);

revoke all privileges on table public.profile_presentations from public, anon, authenticated;
grant select on table public.profile_presentations to authenticated;

-- The view is the sole public read boundary: drafts stay in the RLS-protected
-- table and the view cannot expose a row until its profile is published.
create view public.published_profile_presentations
with (security_barrier = true) as
select profile_presentations.profile_id, profile_presentations.published
from public.profile_presentations
join public.profiles on profiles.id = profile_presentations.profile_id
where profiles.status = 'published';

revoke all privileges on table public.published_profile_presentations from public, anon, authenticated;
grant select on table public.published_profile_presentations to anon, authenticated;

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
    or coalesce(p_draft ->> 'template', '') not in ('minimal', 'cover')
    or pg_catalog.jsonb_typeof(p_draft -> 'cover') is distinct from 'object'
    or coalesce(pg_catalog.jsonb_typeof(p_draft #> '{cover,coverPath}'), '') not in ('string', 'null')
    or coalesce(pg_catalog.jsonb_typeof(p_draft #> '{cover,photoPathOverride}'), '') not in ('string', 'null')
    or pg_catalog.jsonb_typeof(p_draft #> '{cover,overlay}') is distinct from 'number'
    or pg_catalog.jsonb_typeof(p_draft #> '{cover,focalY}') is distinct from 'number'
    or coalesce(p_draft #>> '{cover,alignment}', '') not in ('lower-left', 'center')
    or case when pg_catalog.jsonb_typeof(p_draft #> '{cover,overlay}') = 'number'
      then (p_draft #>> '{cover,overlay}')::numeric not between 0.15 and 0.70 else true end
    or case when pg_catalog.jsonb_typeof(p_draft #> '{cover,focalY}') = 'number'
      then (p_draft #>> '{cover,focalY}')::numeric not between 0 and 100 else true end then
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

create or replace function public.publish_own_profile_presentation()
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

  select profiles.id
  into strict v_profile_id
  from public.profiles
  where profiles.owner_id = v_owner_id
  for update;

  insert into public.profile_presentations (profile_id)
  values (v_profile_id)
  on conflict (profile_id) do nothing;

  update public.profile_presentations
  set published = draft
  where profile_presentations.profile_id = v_profile_id;
end;
$$;

revoke all on function public.publish_own_profile_presentation() from public, anon, service_role;
grant execute on function public.publish_own_profile_presentation() to authenticated;

insert into storage.buckets (id, name, public)
values ('profile-covers', 'profile-covers', false)
on conflict (id) do nothing;

drop policy if exists "owners upload their own profile cover" on storage.objects;
create policy "owners upload their own profile cover"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'profile-covers'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

drop policy if exists "owners update their own profile cover" on storage.objects;
create policy "owners update their own profile cover"
on storage.objects for update to authenticated
using (
  bucket_id = 'profile-covers'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-covers'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

drop policy if exists "owners delete their own profile cover" on storage.objects;
create policy "owners delete their own profile cover"
on storage.objects for delete to authenticated
using (
  bucket_id = 'profile-covers'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

drop policy if exists "owners read their own profile cover" on storage.objects;
create policy "owners read their own profile cover"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-covers'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

drop policy if exists "published profile covers are readable" on storage.objects;
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
      and profile_presentations.published ->> 'template' = 'cover'
      and profile_presentations.published #>> '{cover,coverPath}' = p_path
  );
$$;

revoke all on function public.is_published_profile_cover(text) from public, anon, authenticated, service_role;
grant execute on function public.is_published_profile_cover(text) to anon, authenticated;

create policy "published profile covers are readable"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'profile-covers'
  and public.is_published_profile_cover(storage.objects.name)
);
