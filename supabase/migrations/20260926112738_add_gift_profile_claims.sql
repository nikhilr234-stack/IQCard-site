-- Gift profiles keep their published identity while remaining unowned until
-- the intended recipient claims them. This migration aligns earlier local
-- schema with the production gift-profile model without changing existing rows.
alter table public.profiles alter column owner_id drop not null;
alter table public.profiles drop constraint if exists profiles_owner_id_key;
create unique index if not exists profiles_owner_id_unique_idx
  on public.profiles (owner_id)
  where owner_id is not null;

create table if not exists public.profile_gift_claims (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  recipient_email text not null check (
    recipient_email = pg_catalog.lower(pg_catalog.btrim(recipient_email))
    and recipient_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  recipient_name text not null check (pg_catalog.length(pg_catalog.btrim(recipient_name)) > 0),
  status text not null default 'unclaimed' check (status in ('unclaimed', 'claimed', 'cancelled')),
  claimed_by uuid references public.user_accounts (id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  claimed_at timestamptz,
  check ((status = 'claimed' and claimed_by is not null and claimed_at is not null)
      or (status <> 'claimed' and claimed_by is null and claimed_at is null))
);

create index if not exists profile_gift_claims_recipient_status_idx
  on public.profile_gift_claims (recipient_email, status, created_at desc);

alter table public.profile_gift_claims enable row level security;
revoke all privileges on table public.profile_gift_claims from public, anon, authenticated, service_role;

-- This service-only provisioning function lets trusted admin tooling create
-- gifts without making recipient email data available through client RLS.
create or replace function public.admin_create_gift_profile_claim(
  p_profile_id uuid,
  p_recipient_email text,
  p_recipient_name text
)
returns public.profile_gift_claims
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_recipient_email, '')));
  v_name text := pg_catalog.btrim(coalesce(p_recipient_name, ''));
  v_profile public.profiles%rowtype;
  v_claim public.profile_gift_claims%rowtype;
begin
  if p_profile_id is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or v_name = '' then
    raise sqlstate '22023' using message = 'Valid profile and recipient details are required';
  end if;

  select profiles.* into strict v_profile
  from public.profiles
  where profiles.id = p_profile_id
  for update;

  if v_profile.owner_id is not null or v_profile.status <> 'published' then
    raise sqlstate 'P0001' using message = 'Gift profile must be published and unowned';
  end if;

  insert into public.profile_gift_claims (profile_id, recipient_email, recipient_name)
  values (p_profile_id, v_email, v_name)
  returning * into strict v_claim;
  return v_claim;
end;
$$;
revoke all on function public.admin_create_gift_profile_claim(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_create_gift_profile_claim(uuid, text, text) to service_role;

-- Discovery returns only the matching user's gift's safe public identity.
create or replace function public.find_own_unclaimed_gift_profile()
returns table(profile_id uuid, slug text, recipient_name text, claimable boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_email text;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;
  select pg_catalog.lower(pg_catalog.btrim(users.email)) into v_email
  from auth.users as users
  where users.id = v_owner_id and users.email_confirmed_at is not null;
  if coalesce(v_email, '') = '' then
    return;
  end if;

  return query
    select profiles.id, profiles.slug, profile_gift_claims.recipient_name,
      not exists (select 1 from public.profiles owned where owned.owner_id = v_owner_id)
    from public.profile_gift_claims
    join public.profiles on profiles.id = profile_gift_claims.profile_id
    where profile_gift_claims.recipient_email = v_email
      and profile_gift_claims.status = 'unclaimed'
      and profiles.owner_id is null
    order by profile_gift_claims.created_at asc
    limit 1;
end;
$$;
revoke all on function public.find_own_unclaimed_gift_profile() from public, anon, service_role;
grant execute on function public.find_own_unclaimed_gift_profile() to authenticated;

-- Claiming is a single transaction. Identity and publication fields are not
-- modified; only ownership and the private claim record transition.
create or replace function public.claim_own_gift_profile()
returns table(profile_id uuid, slug text, recipient_name text, claimable boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_email text;
  v_claim public.profile_gift_claims%rowtype;
  v_profile public.profiles%rowtype;
begin
  if v_owner_id is null then
    raise sqlstate '42501' using message = 'Authentication required';
  end if;
  select pg_catalog.lower(pg_catalog.btrim(users.email)) into v_email
  from auth.users as users
  where users.id = v_owner_id and users.email_confirmed_at is not null;
  if coalesce(v_email, '') = '' then
    raise sqlstate '42501' using message = 'A verified account email is required';
  end if;

  if exists (select 1 from public.profiles where profiles.owner_id = v_owner_id for update) then
    raise sqlstate 'P0001' using message = 'An existing profile already belongs to this account';
  end if;

  select profile_gift_claims.* into v_claim
  from public.profile_gift_claims
  where profile_gift_claims.recipient_email = v_email
    and profile_gift_claims.status = 'unclaimed'
  order by profile_gift_claims.created_at asc
  limit 1
  for update;

  if not found then
    raise sqlstate 'P0002' using message = 'No unclaimed gift was found for this account';
  end if;

  select profiles.* into v_profile
  from public.profiles
  where profiles.id = v_claim.profile_id
  for update;

  if not found or v_profile.owner_id is not null then
    raise sqlstate 'P0001' using message = 'Gift profile is no longer claimable';
  end if;

  update public.profiles set owner_id = v_owner_id where profiles.id = v_profile.id;
  update public.profile_gift_claims
  set status = 'claimed', claimed_by = v_owner_id, claimed_at = pg_catalog.now()
  where profile_gift_claims.profile_id = v_claim.profile_id;

    return query select v_profile.id, v_profile.slug, v_claim.recipient_name, true;
end;
$$;
revoke all on function public.claim_own_gift_profile() from public, anon, service_role;
grant execute on function public.claim_own_gift_profile() to authenticated;
