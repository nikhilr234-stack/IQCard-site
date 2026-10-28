create sequence if not exists public.paid_order_number_seq;

create table public.paid_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  owner_id uuid not null references public.user_accounts(id) on delete restrict,
  client_request_key uuid not null,
  email text not null,
  phone text not null,
  design_id text not null,
  card_snapshot jsonb not null,
  shipping_address jsonb not null,
  profile_id uuid references public.profiles(id) on delete restrict,
  currency text not null default 'INR' check (currency = 'INR'),
  pricing_version text not null check (pricing_version = 'flat-inr-v2'),
  card_subtotal_paise bigint not null check (card_subtotal_paise = 79900),
  shipping_paise bigint not null check (shipping_paise >= 0),
  tax_paise bigint not null check (tax_paise >= 0),
  total_paise bigint not null check (total_paise = card_subtotal_paise + shipping_paise + tax_paise),
  payment_provider text check (payment_provider is null or payment_provider = 'razorpay'),
  gateway_order_id text unique,
  gateway_payment_id text unique,
  provider_create_lease_token uuid,
  provider_create_lease_until timestamptz,
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','cancelled','refund_pending','refunded')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','awaiting_profile','in_production','shipped','delivered','cancelled')),
  tracking_carrier text,
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, client_request_key),
  check (jsonb_typeof(card_snapshot) = 'object'),
  check (jsonb_typeof(shipping_address) = 'object')
);

create index paid_orders_owner_created_idx on public.paid_orders(owner_id, created_at desc);
create index paid_orders_status_created_idx on public.paid_orders(payment_status, fulfillment_status, created_at desc);
create index paid_orders_profile_idx on public.paid_orders(profile_id) where profile_id is not null;
create index paid_orders_provider_lease_idx on public.paid_orders(provider_create_lease_until) where provider_create_lease_until is not null;

create table public.paid_order_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.paid_orders(id) on delete cascade,
  gateway_order_id text not null,
  gateway_payment_id text,
  amount_paise bigint not null,
  currency text not null check (currency = 'INR'),
  status text not null check (status in ('created','authorized','captured','failed')),
  created_at timestamptz not null default now(),
  unique(gateway_order_id, gateway_payment_id)
);
create index paid_order_payment_attempts_order_idx on public.paid_order_payment_attempts(order_id, created_at desc);

create table public.paid_order_payment_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  event_type text not null,
  order_id uuid references public.paid_orders(id) on delete set null,
  gateway_order_id text not null,
  gateway_payment_id text not null,
  amount_paise bigint not null,
  currency text not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  outcome text not null,
  created_at timestamptz not null default now()
);
create index paid_order_payment_events_order_idx on public.paid_order_payment_events(order_id, created_at desc);

create table public.paid_order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.paid_orders(id) on delete cascade,
  event_type text not null,
  source text not null check (source in ('system','payment_webhook','admin','customer')),
  actor_id uuid references public.user_accounts(id) on delete set null,
  previous_payment_status text,
  new_payment_status text,
  previous_fulfillment_status text,
  new_fulfillment_status text,
  previous_tracking_carrier text,
  new_tracking_carrier text,
  previous_tracking_number text,
  new_tracking_number text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index paid_order_status_events_order_idx on public.paid_order_status_events(order_id, created_at);
create index paid_order_status_events_actor_idx on public.paid_order_status_events(actor_id) where actor_id is not null;

create table public.paid_order_email_outbox (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.paid_orders(id) on delete cascade,
  event_key text not null,
  recipient text not null,
  subject text not null,
  body_text text not null,
  status text not null default 'pending' check (status in ('pending','sending','sent','failed')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  claim_token uuid,
  claim_until timestamptz,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, event_key)
);
create index paid_order_email_outbox_ready_idx on public.paid_order_email_outbox(available_at, created_at) where status in ('pending','failed','sending');

alter table public.paid_orders enable row level security;
alter table public.paid_order_payment_attempts enable row level security;
alter table public.paid_order_payment_events enable row level security;
alter table public.paid_order_status_events enable row level security;
alter table public.paid_order_email_outbox enable row level security;

create policy "owners read their paid orders" on public.paid_orders for select to authenticated using (owner_id = auth.uid());
create policy "admins read paid orders" on public.paid_orders for select to authenticated using (public.is_current_user_admin());
create policy "admins read order status history" on public.paid_order_status_events for select to authenticated using (public.is_current_user_admin());

revoke all on public.paid_orders, public.paid_order_payment_attempts, public.paid_order_payment_events, public.paid_order_status_events, public.paid_order_email_outbox from anon, authenticated;
grant select on public.paid_orders to authenticated;
grant select on public.paid_order_status_events to authenticated;
grant all on public.paid_orders, public.paid_order_payment_attempts, public.paid_order_payment_events, public.paid_order_status_events, public.paid_order_email_outbox to service_role;
grant usage, select on sequence public.paid_order_number_seq to service_role;

create or replace function public.create_or_get_pending_paid_order(
  p_owner_id uuid, p_email text, p_request_key uuid, p_design_id text, p_card_snapshot jsonb,
  p_phone text, p_shipping_address jsonb, p_card_subtotal_paise bigint, p_shipping_paise bigint,
  p_tax_paise bigint, p_total_paise bigint, p_currency text, p_pricing_version text
) returns public.paid_orders
language plpgsql security definer set search_path = '' as $$
declare v_order public.paid_orders%rowtype; v_number text;
begin
  if p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or p_design_id !~ '^IQD-[A-Za-z0-9]{6,32}$'
    or p_phone !~ '^\+91[6-9][0-9]{9}$' or p_card_subtotal_paise <> 79900
    or p_shipping_paise < 0 or p_tax_paise < 0 or p_total_paise <> 79900 + p_shipping_paise + p_tax_paise
    or p_currency <> 'INR' or p_pricing_version <> 'flat-inr-v2' then raise exception 'invalid_order'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text || ':' || p_request_key::text, 0));
  select * into v_order from public.paid_orders where owner_id = p_owner_id and client_request_key = p_request_key;
  if found then return v_order; end if;
  v_number := 'IQ-' || to_char(now() at time zone 'UTC', 'YYMMDD') || '-' || lpad(nextval('public.paid_order_number_seq')::text, 6, '0');
  insert into public.paid_orders(order_number, owner_id, client_request_key, email, phone, design_id, card_snapshot, shipping_address,
    card_subtotal_paise, shipping_paise, tax_paise, total_paise, currency, pricing_version)
  values(v_number, p_owner_id, p_request_key, lower(trim(p_email)), p_phone, p_design_id, p_card_snapshot, p_shipping_address,
    p_card_subtotal_paise, p_shipping_paise, p_tax_paise, p_total_paise, p_currency, p_pricing_version)
  returning * into v_order;
  insert into public.paid_order_status_events(order_id, event_type, source, new_payment_status, new_fulfillment_status)
  values(v_order.id, 'order_created', 'system', v_order.payment_status, v_order.fulfillment_status);
  return v_order;
end $$;

create or replace function public.reserve_paid_order_provider_creation(p_order_id uuid, p_lease_token uuid, p_lease_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.paid_orders%rowtype;
begin
  select * into v_order from public.paid_orders where id = p_order_id for update;
  if not found or v_order.payment_status <> 'pending' or v_order.gateway_order_id is not null then return false; end if;
  if v_order.provider_create_lease_until is not null and v_order.provider_create_lease_until > now() then return false; end if;
  update public.paid_orders set provider_create_lease_token = p_lease_token,
    provider_create_lease_until = now() + make_interval(secs => greatest(30, least(p_lease_seconds, 300))), updated_at = now()
  where id = p_order_id;
  return true;
end $$;

create or replace function public.attach_paid_order_provider_order(p_order_id uuid, p_lease_token uuid, p_gateway_order_id text, p_gateway_amount_paise bigint, p_gateway_currency text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_order public.paid_orders%rowtype;
begin
  select * into v_order from public.paid_orders where id = p_order_id for update;
  if not found or v_order.payment_status <> 'pending' or v_order.provider_create_lease_token <> p_lease_token
    or v_order.provider_create_lease_until < now() or v_order.gateway_order_id is not null
    or p_gateway_order_id !~ '^order_[A-Za-z0-9]+$' or p_gateway_amount_paise <> v_order.total_paise or p_gateway_currency <> v_order.currency then return false; end if;
  update public.paid_orders set gateway_order_id = p_gateway_order_id, payment_provider = 'razorpay',
    provider_create_lease_token = null, provider_create_lease_until = null, updated_at = now() where id = p_order_id;
  insert into public.paid_order_payment_attempts(order_id, gateway_order_id, amount_paise, currency, status)
  values(p_order_id, p_gateway_order_id, p_gateway_amount_paise, p_gateway_currency, 'created');
  return true;
end $$;

create or replace function public.release_paid_order_provider_creation(p_order_id uuid, p_lease_token uuid)
returns void language sql security definer set search_path = '' as $$
  update public.paid_orders set provider_create_lease_token = null, provider_create_lease_until = null, updated_at = now()
  where id = p_order_id and provider_create_lease_token = p_lease_token and gateway_order_id is null
$$;

create or replace function public.process_razorpay_payment_event(
  p_event_id text, p_event_type text, p_gateway_order_id text, p_gateway_payment_id text,
  p_amount_paise bigint, p_currency text, p_payment_status text, p_payload_sha256 text
) returns table(outcome text, order_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_order public.paid_orders%rowtype; v_inserted uuid; v_previous_payment text;
begin
  select * into v_order from public.paid_orders where gateway_order_id = p_gateway_order_id for update;
  if not found then return query select 'order_mismatch'::text, null::uuid; return; end if;
  if p_amount_paise <> v_order.total_paise or p_currency <> v_order.currency then return query select 'amount_mismatch'::text, v_order.id; return; end if;
  insert into public.paid_order_payment_events(event_id,event_type,order_id,gateway_order_id,gateway_payment_id,amount_paise,currency,payload_sha256,outcome)
  values(p_event_id,p_event_type,v_order.id,p_gateway_order_id,p_gateway_payment_id,p_amount_paise,p_currency,p_payload_sha256,'received')
  on conflict(event_id) do nothing returning id into v_inserted;
  if v_inserted is null then return query select 'duplicate'::text, v_order.id; return; end if;
  if p_payment_status = 'captured' and v_order.payment_status in ('pending','failed') then
    v_previous_payment := v_order.payment_status;
    update public.paid_orders set payment_status='paid', fulfillment_status='awaiting_profile', gateway_payment_id=p_gateway_payment_id, updated_at=now() where id=v_order.id returning * into v_order;
    insert into public.paid_order_payment_attempts(order_id,gateway_order_id,gateway_payment_id,amount_paise,currency,status)
    values(v_order.id,p_gateway_order_id,p_gateway_payment_id,p_amount_paise,p_currency,'captured')
    on conflict(gateway_order_id,gateway_payment_id) do update set status='captured';
    insert into public.paid_order_status_events(order_id,event_type,source,previous_payment_status,new_payment_status,previous_fulfillment_status,new_fulfillment_status,metadata)
    values(v_order.id,'payment_captured','payment_webhook',v_previous_payment,'paid',v_order.fulfillment_status,'awaiting_profile',jsonb_build_object('gateway_payment_id',p_gateway_payment_id));
    insert into public.paid_order_email_outbox(order_id,event_key,recipient,subject,body_text)
    values(v_order.id,'payment-confirmed',v_order.email,'Your IQ Card order is confirmed', 'We received your payment for order ' || v_order.order_number || '. Confirm your published profile as the NFC destination in your account.')
    on conflict on constraint paid_order_email_outbox_order_id_event_key_key do nothing;
    update public.paid_order_payment_events set outcome='processed' where id=v_inserted;
    return query select 'processed'::text,v_order.id; return;
  elsif p_payment_status = 'failed' and v_order.payment_status = 'pending' then
    update public.paid_orders set payment_status='failed', updated_at=now() where id=v_order.id;
    insert into public.paid_order_status_events(order_id,event_type,source,previous_payment_status,new_payment_status,metadata)
    values(v_order.id,'payment_failed','payment_webhook','pending','failed',jsonb_build_object('gateway_payment_id',p_gateway_payment_id));
    update public.paid_order_payment_events set outcome='processed' where id=v_inserted;
    return query select 'processed'::text,v_order.id; return;
  end if;
  update public.paid_order_payment_events set outcome='ignored' where id=v_inserted;
  return query select 'ignored'::text,v_order.id;
end $$;

create or replace function public.confirm_paid_order_profile_for_owner(p_order_id uuid, p_owner_id uuid)
returns table(outcome text, profile_id uuid, profile_slug text)
language plpgsql security definer set search_path = '' as $$
declare v_order public.paid_orders%rowtype; v_profile public.profiles%rowtype;
begin
  select * into v_order from public.paid_orders where id=p_order_id and owner_id=p_owner_id for update;
  if not found or v_order.payment_status <> 'paid' then return query select 'order_not_ready'::text,null::uuid,null::text; return; end if;
  if v_order.profile_id is not null then
    select * into v_profile from public.profiles where id=v_order.profile_id;
    if found then return query select 'confirmed'::text,v_profile.id,v_profile.slug; return; end if;
  end if;
  select * into v_profile from public.profiles where owner_id=p_owner_id and status='published';
  if not found then return query select 'profile_not_ready'::text,null::uuid,null::text; return; end if;
  if v_order.fulfillment_status not in ('unfulfilled','awaiting_profile') then return query select 'order_not_ready'::text,null::uuid,null::text; return; end if;
  update public.paid_orders set profile_id=v_profile.id, fulfillment_status='awaiting_profile', updated_at=now() where id=p_order_id;
  insert into public.paid_order_status_events(order_id,event_type,source,new_fulfillment_status,metadata)
  values(p_order_id,'profile_destination_confirmed','customer','awaiting_profile',jsonb_build_object('profile_id',v_profile.id));
  return query select 'confirmed'::text,v_profile.id,v_profile.slug;
end $$;

create or replace function public.admin_update_paid_order(
 p_order_id uuid, p_actor_id uuid, p_payment_status text, p_fulfillment_status text, p_tracking_carrier text, p_tracking_number text
) returns table(outcome text) language plpgsql security definer set search_path = '' as $$
declare v_order public.paid_orders%rowtype; v_old_payment text; v_old_fulfillment text; v_old_carrier text; v_old_tracking text;
begin
  if not exists(select 1 from public.user_accounts where id=p_actor_id and role='admin') then return query select 'forbidden'::text; return; end if;
  select * into v_order from public.paid_orders where id=p_order_id for update;
  if not found then return query select 'not_found'::text; return; end if;
  v_old_payment:=v_order.payment_status; v_old_fulfillment:=v_order.fulfillment_status; v_old_carrier:=v_order.tracking_carrier; v_old_tracking:=v_order.tracking_number;
  if p_payment_status is not null then
    if not ((v_order.payment_status='paid' and p_payment_status='refund_pending') or (v_order.payment_status='refund_pending' and p_payment_status='refunded')) then
      return query select 'invalid_transition'::text; return;
    end if;
    update public.paid_orders set payment_status=p_payment_status, updated_at=now() where id=p_order_id returning * into v_order;
  end if;
  if p_fulfillment_status is not null then
    if p_fulfillment_status not in ('in_production','shipped','delivered','cancelled') then return query select 'invalid_transition'::text; return; end if;
    if p_fulfillment_status='in_production' and not (v_order.fulfillment_status='awaiting_profile' and v_order.payment_status='paid'
      and v_order.profile_id is not null and exists(select 1 from public.profiles where id=v_order.profile_id and status='published')) then return query select 'invalid_transition'::text; return; end if;
    if p_fulfillment_status='shipped' and not (v_order.fulfillment_status='in_production' and v_order.payment_status in ('paid','refund_pending')
      and length(trim(coalesce(p_tracking_carrier,''))) between 1 and 80 and length(trim(coalesce(p_tracking_number,''))) between 1 and 120) then return query select 'invalid_transition'::text; return; end if;
    if p_fulfillment_status='delivered' and not (v_order.fulfillment_status='shipped') then return query select 'invalid_transition'::text; return; end if;
    if p_fulfillment_status='cancelled' and not (v_order.fulfillment_status in ('awaiting_profile','in_production','shipped') and v_order.payment_status in ('paid','refund_pending','refunded')) then return query select 'invalid_transition'::text; return; end if;
    update public.paid_orders set fulfillment_status=p_fulfillment_status,
      tracking_carrier=case when p_fulfillment_status='shipped' then trim(p_tracking_carrier) else tracking_carrier end,
      tracking_number=case when p_fulfillment_status='shipped' then trim(p_tracking_number) else tracking_number end,
      updated_at=now() where id=p_order_id returning * into v_order;
    if p_fulfillment_status in ('shipped','delivered') then
      insert into public.paid_order_email_outbox(order_id,event_key,recipient,subject,body_text)
      values(v_order.id,'fulfillment-'||p_fulfillment_status,v_order.email,
        case when p_fulfillment_status='shipped' then 'Your IQ Card is on its way' else 'Your IQ Card was delivered' end,
        case when p_fulfillment_status='shipped' then 'Order '||v_order.order_number||' shipped via '||v_order.tracking_carrier||'. Tracking: '||v_order.tracking_number
        else 'Order '||v_order.order_number||' is marked delivered.' end)
      on conflict on constraint paid_order_email_outbox_order_id_event_key_key do nothing;
    end if;
  end if;
  insert into public.paid_order_status_events(order_id,event_type,source,actor_id,previous_payment_status,new_payment_status,previous_fulfillment_status,new_fulfillment_status,previous_tracking_carrier,new_tracking_carrier,previous_tracking_number,new_tracking_number)
  values(v_order.id,coalesce(p_payment_status,'fulfillment_updated'),'admin',p_actor_id,v_old_payment,v_order.payment_status,v_old_fulfillment,v_order.fulfillment_status,v_old_carrier,v_order.tracking_carrier,v_old_tracking,v_order.tracking_number);
  return query select 'updated'::text;
end $$;

create or replace function public.claim_paid_order_email_batch(p_batch_size integer)
returns table(id uuid, order_id uuid, recipient text, subject text, body_text text, attempts integer, claim_token uuid)
language plpgsql security definer set search_path = '' as $$
begin
  return query with selected as (
    select o.id from public.paid_order_email_outbox o
    where ((o.status in ('pending','failed') and o.attempts < 5 and o.available_at<=now()) or (o.status='sending' and o.attempts < 5 and o.claim_until<now()))
    order by o.created_at for update skip locked limit greatest(1,least(p_batch_size,10))
  ) update public.paid_order_email_outbox o set status='sending', attempts=o.attempts+1,
    claim_token=gen_random_uuid(), claim_until=now()+interval '2 minutes'
    from selected s where o.id=s.id
    returning o.id,o.order_id,o.recipient,o.subject,o.body_text,o.attempts,o.claim_token;
end $$;

create or replace function public.complete_paid_order_email(p_email_id uuid, p_claim_token uuid, p_success boolean, p_error text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.paid_order_email_outbox set status=case when p_success then 'sent' else case when attempts>=5 then 'failed' else 'pending' end end,
    sent_at=case when p_success then now() else null end, last_error=case when p_success then null else left(coalesce(p_error,'delivery_failed'),100) end,
    available_at=case when p_success then available_at else now()+make_interval(mins => least(60, power(2,least(attempts,6))::integer)) end,
    claim_token=null, claim_until=null
  where id=p_email_id and status='sending' and claim_token=p_claim_token;
  return found;
end $$;

revoke all on function public.create_or_get_pending_paid_order(uuid,text,uuid,text,jsonb,text,jsonb,bigint,bigint,bigint,bigint,text,text) from public, anon, authenticated;
revoke all on function public.reserve_paid_order_provider_creation(uuid,uuid,integer) from public, anon, authenticated;
revoke all on function public.attach_paid_order_provider_order(uuid,uuid,text,bigint,text) from public, anon, authenticated;
revoke all on function public.release_paid_order_provider_creation(uuid,uuid) from public, anon, authenticated;
revoke all on function public.process_razorpay_payment_event(text,text,text,text,bigint,text,text,text) from public, anon, authenticated;
revoke all on function public.confirm_paid_order_profile_for_owner(uuid,uuid) from public, anon, authenticated;
revoke all on function public.admin_update_paid_order(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.claim_paid_order_email_batch(integer) from public, anon, authenticated;
revoke all on function public.complete_paid_order_email(uuid,uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.create_or_get_pending_paid_order(uuid,text,uuid,text,jsonb,text,jsonb,bigint,bigint,bigint,bigint,text,text) to service_role;
grant execute on function public.reserve_paid_order_provider_creation(uuid,uuid,integer) to service_role;
grant execute on function public.attach_paid_order_provider_order(uuid,uuid,text,bigint,text) to service_role;
grant execute on function public.release_paid_order_provider_creation(uuid,uuid) to service_role;
grant execute on function public.process_razorpay_payment_event(text,text,text,text,bigint,text,text,text) to service_role;
grant execute on function public.confirm_paid_order_profile_for_owner(uuid,uuid) to service_role;
grant execute on function public.admin_update_paid_order(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.claim_paid_order_email_batch(integer) to service_role;
grant execute on function public.complete_paid_order_email(uuid,uuid,boolean,text) to service_role;

revoke all on function public.is_current_user_admin() from anon;
grant execute on function public.is_current_user_admin() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.enforce_published_profile_validity() from public, anon, authenticated;
grant execute on function public.is_published_profile_cover(text) to anon, authenticated;
