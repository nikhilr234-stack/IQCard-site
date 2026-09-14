drop policy if exists "published profile images are readable" on storage.objects;

drop policy if exists "owners read their own profile image" on storage.objects;
create policy "owners read their own profile image"
on storage.objects for select to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(storage.objects.name))[1] = auth.uid()::text
);

create policy "published profile images are readable"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'profile-images'
  and exists (
    select 1 from public.profiles
    where profiles.photo_path = storage.objects.name
      and profiles.status = 'published'
  )
);

create or replace function public.replace_own_profile_links(p_links jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_profile_id uuid;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;
  if p_links is null or pg_catalog.jsonb_typeof(p_links) <> 'array' then
    raise sqlstate '22023' using message = 'Links must be a JSON array';
  end if;
  select profiles.id into v_profile_id from public.profiles where profiles.owner_id = v_owner_id;
  if not found then
    raise sqlstate 'P0002' using message = 'Profile not found';
  end if;
  delete from public.profile_links where profile_links.profile_id = v_profile_id;
  insert into public.profile_links (profile_id, label, url, sort_order)
  select v_profile_id, link.value ->> 'label', link.value ->> 'url', (link.ordinality - 1)::integer
  from pg_catalog.jsonb_array_elements(p_links) with ordinality as link(value, ordinality)
  order by link.ordinality;
end;
$$;

revoke all on function public.replace_own_profile_links(jsonb) from public, anon, service_role;
grant execute on function public.replace_own_profile_links(jsonb) to authenticated;

create or replace function public.complete_own_onboarding_publish(p_publish boolean)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_completed_steps text[];
  v_updated_profiles integer;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;
  if p_publish is null then
    raise sqlstate '22004' using message = 'Publication choice is required';
  end if;
  select onboarding_progress.completed_steps into v_completed_steps
  from public.onboarding_progress
  where onboarding_progress.owner_id = v_owner_id
  for update;
  if not found then
    raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
  end if;
  if not (array['identity', 'contact', 'content', 'address', 'preview']::text[] <@ v_completed_steps) then
    raise sqlstate 'P0001' using message = 'Complete the earlier onboarding steps first';
  end if;
  update public.profiles
  set status = case when p_publish then 'published' else 'draft' end,
      published_at = case when p_publish then pg_catalog.now() else null end
  where profiles.owner_id = v_owner_id;
  get diagnostics v_updated_profiles = row_count;
  if v_updated_profiles <> 1 then
    raise sqlstate 'P0002' using message = 'Profile not found';
  end if;
  insert into public.onboarding_progress (owner_id, current_step, completed_steps, completed_at)
  values (v_owner_id, 'publish', array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[], pg_catalog.now())
  on conflict (owner_id) do update
  set current_step = 'publish',
      completed_steps = array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[],
      completed_at = pg_catalog.now();
end;
$$;

revoke all on function public.complete_own_onboarding_publish(boolean) from public, anon, service_role;
grant execute on function public.complete_own_onboarding_publish(boolean) to authenticated;

create or replace function public.replace_registration_intent(
  p_id uuid, p_token_hash text, p_email text, p_design_id text, p_design_payload jsonb,
  p_schema_version integer, p_first_name text, p_last_name text, p_expires_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.registration_intents
  set status = 'cancelled'
  where registration_intents.email = p_email
    and registration_intents.design_id = p_design_id
    and registration_intents.status = 'pending';
  insert into public.registration_intents (
    id, token_hash, email, design_id, design_payload, schema_version,
    first_name, last_name, status, expires_at
  ) values (
    p_id, p_token_hash, p_email, p_design_id, p_design_payload, p_schema_version,
    p_first_name, p_last_name, 'pending', p_expires_at
  );
end;
$$;

revoke all on function public.replace_registration_intent(uuid, text, text, text, jsonb, integer, text, text, timestamptz)
from public, anon, authenticated;
grant execute on function public.replace_registration_intent(uuid, text, text, text, jsonb, integer, text, text, timestamptz)
to service_role;

create table if not exists public.data_backfill_markers (
  name text primary key,
  completed_at timestamptz not null default pg_catalog.now()
);
alter table public.data_backfill_markers enable row level security;
revoke all on table public.data_backfill_markers from public, anon, authenticated, service_role;

do $visibility_backfill$
declare
  v_marker_claimed integer;
begin
  insert into public.data_backfill_markers (name)
  values ('202609060002_legacy_contact_visibility')
  on conflict (name) do nothing;
  get diagnostics v_marker_claimed = row_count;
  if v_marker_claimed = 1 then
    update public.profiles
    set
      public_email_visible = case when pg_catalog.btrim(profiles.email) <> '' then true else profiles.public_email_visible end,
      phone_visible = case when pg_catalog.btrim(profiles.phone) <> '' then true else profiles.phone_visible end
    where profiles.status = 'published'
      and (
        (pg_catalog.btrim(profiles.email) <> '' and profiles.public_email_visible = false)
        or (pg_catalog.btrim(profiles.phone) <> '' and profiles.phone_visible = false)
      );
  end if;
end;
$visibility_backfill$;
