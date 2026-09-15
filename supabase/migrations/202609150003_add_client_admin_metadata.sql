create table if not exists public.client_admin_metadata (
  owner_id uuid primary key references public.user_accounts(id) on delete cascade,
  segment text not null default 'Unassigned',
  invite_sent_at timestamptz,
  invite_opened_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.client_admin_metadata enable row level security;

revoke all privileges on table public.client_admin_metadata from public, anon, authenticated;
grant all privileges on table public.client_admin_metadata to service_role;

create trigger on_client_admin_metadata_updated
  before update on public.client_admin_metadata
  for each row execute procedure public.set_updated_at();

insert into public.client_admin_metadata (owner_id)
select id
from public.user_accounts
where role = 'client'
on conflict (owner_id) do nothing;
