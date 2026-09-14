create table public.checkout_handoffs (
  token uuid primary key default gen_random_uuid(),
  email text not null,
  design_id text not null,
  payload jsonb not null,
  owner_id uuid references public.user_accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  claimed_at timestamptz
);

create index checkout_handoffs_owner_idx on public.checkout_handoffs (owner_id, claimed_at desc);
create index checkout_handoffs_expiry_idx on public.checkout_handoffs (expires_at);

alter table public.checkout_handoffs enable row level security;
