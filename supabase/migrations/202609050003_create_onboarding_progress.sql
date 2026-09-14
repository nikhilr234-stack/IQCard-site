create table public.onboarding_progress (
  owner_id uuid primary key references public.user_accounts (id) on delete cascade,
  schema_version integer not null default 1 check (schema_version = 1),
  current_step text not null default 'identity'
    check (current_step in ('identity', 'contact', 'content', 'address', 'preview', 'publish')),
  completed_steps text[] not null default '{}'
    check (completed_steps <@ array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[]),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.onboarding_progress enable row level security;

create policy "owners manage their onboarding progress"
on public.onboarding_progress for all to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create trigger on_onboarding_progress_updated
  before update on public.onboarding_progress
  for each row execute procedure public.set_updated_at();

insert into public.onboarding_progress (
  owner_id, current_step, completed_steps, started_at, updated_at, completed_at
)
select
  owner_id,
  'publish',
  array['identity', 'contact', 'content', 'address', 'preview', 'publish']::text[],
  created_at,
  updated_at,
  coalesce(published_at, updated_at)
from public.profiles
where status = 'published'
on conflict (owner_id) do nothing;
