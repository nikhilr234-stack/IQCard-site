create table public.registration_rate_limit_events (
  id bigint generated always as identity primary key,
  key_hash text not null check (key_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now()
);

create index registration_rate_limit_events_lookup_idx
  on public.registration_rate_limit_events (key_hash, created_at desc);
create index registration_rate_limit_events_created_idx
  on public.registration_rate_limit_events (created_at);

alter table public.registration_rate_limit_events enable row level security;

create or replace function public.consume_registration_rate_limit(
  p_key_hash text,
  p_window_seconds integer,
  p_maximum integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_key_hash !~ '^[a-f0-9]{64}$' or p_window_seconds < 1 or p_maximum < 1 then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_key_hash, 0));
  delete from public.registration_rate_limit_events
  where created_at < now() - interval '1 day';
  insert into public.registration_rate_limit_events (key_hash) values (p_key_hash);
  select count(*) into v_count
  from public.registration_rate_limit_events
  where key_hash = p_key_hash
    and created_at > now() - make_interval(secs => p_window_seconds);
  return v_count <= p_maximum;
end;
$$;

revoke all on function public.consume_registration_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_registration_rate_limit(text, integer, integer) to service_role;
