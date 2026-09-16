-- Public profile pages query the profile and its published presentation in
-- parallel. Expose only the already-public slug alongside the published JSON.
create or replace view public.published_profile_presentations
with (security_barrier = true) as
select
  profile_presentations.profile_id,
  profile_presentations.published,
  profiles.slug
from public.profile_presentations
join public.profiles on profiles.id = profile_presentations.profile_id
where profiles.status = 'published';

revoke all privileges on table public.published_profile_presentations from public, anon, authenticated;
grant select on table public.published_profile_presentations to anon, authenticated;
