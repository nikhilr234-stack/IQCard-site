create table public.registration_intents (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  email text not null check (email = lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  design_id text not null check (design_id ~* '^IQD-[A-Z0-9-]{4,80}$'),
  design_payload jsonb not null check (jsonb_typeof(design_payload) = 'object'),
  schema_version integer not null default 1 check (schema_version = 1),
  first_name text not null check (length(btrim(first_name)) > 0),
  last_name text not null check (length(btrim(last_name)) > 0),
  status text not null default 'pending' check (status in ('pending', 'claimed', 'expired', 'cancelled')),
  owner_id uuid references public.user_accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  claimed_at timestamptz,
  check (
    (status = 'claimed' and owner_id is not null and claimed_at is not null)
    or (status <> 'claimed')
  )
);

create index registration_intents_email_idx on public.registration_intents (email, created_at desc);
create index registration_intents_owner_idx on public.registration_intents (owner_id, claimed_at desc) where owner_id is not null;
create index registration_intents_expiry_idx on public.registration_intents (expires_at) where status = 'pending';
create index registration_intents_status_idx on public.registration_intents (status, created_at desc);
create unique index registration_intents_one_pending_design_idx
  on public.registration_intents (email, design_id)
  where status = 'pending';

alter table public.registration_intents enable row level security;

comment on table public.registration_intents is
  'Server-managed, expiring registration handoffs. Access is restricted to the service role.';

create or replace function public.claim_registration_intent(
  p_token_hash text,
  p_owner_id uuid,
  p_email text
)
returns table(status text, intent_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intent public.registration_intents%rowtype;
begin
  select registration_intents.*
  into v_intent
  from public.registration_intents
  where token_hash = p_token_hash
  for update;

  if not found then
    return query select 'missing'::text, null::text;
    return;
  end if;

  if v_intent.status = 'expired' then
    return query select 'expired'::text, null::text;
    return;
  end if;

  if v_intent.status <> 'pending' then
    return query select 'already-used'::text, null::text;
    return;
  end if;

  if v_intent.expires_at <= now() then
    update public.registration_intents
    set status = 'expired'
    where registration_intents.token_hash = p_token_hash and registration_intents.status = 'pending';
    return query select 'expired'::text, null::text;
    return;
  end if;

  if v_intent.email <> lower(btrim(p_email)) then
    return query select 'email-mismatch'::text, null::text;
    return;
  end if;

  update public.registration_intents
  set owner_id = p_owner_id,
      claimed_at = now(),
      status = 'claimed'
  where registration_intents.token_hash = p_token_hash and registration_intents.status = 'pending';

  return query select 'claimed'::text, v_intent.id::text;
end;
$$;

revoke all on function public.claim_registration_intent(text, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_registration_intent(text, uuid, text) to service_role;
