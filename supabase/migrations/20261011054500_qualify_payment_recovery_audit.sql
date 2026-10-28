-- Qualify audit columns so the output parameter order_id cannot shadow them.
create or replace function public.reconcile_razorpay_captured_payment(
  p_order_id uuid, p_owner_id uuid, p_gateway_payment_id text,
  p_amount_paise bigint, p_currency text, p_payload_sha256 text
) returns table(outcome text, order_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_order public.paid_orders%rowtype; v_outcome text; v_result_order uuid;
begin
  select * into v_order from public.paid_orders
  where id=p_order_id and owner_id=p_owner_id for update;
  if not found or v_order.gateway_order_id is null then
    return query select 'order_mismatch'::text, null::uuid; return;
  end if;
  if p_gateway_payment_id !~ '^pay_[A-Za-z0-9]+$' then
    return query select 'order_mismatch'::text, v_order.id; return;
  end if;
  if v_order.payment_status not in ('pending','failed') then
    return query select 'ignored'::text, v_order.id; return;
  end if;
  select r.outcome, r.order_id into v_outcome, v_result_order
  from public.process_razorpay_payment_event(
    'api_reconcile_' || p_gateway_payment_id, 'payment.api_reconciled',
    v_order.gateway_order_id, p_gateway_payment_id, p_amount_paise,
    p_currency, 'captured', p_payload_sha256
  ) r;
  if v_outcome='processed' then
    update public.paid_order_status_events as audit
    set source='system', metadata=audit.metadata || jsonb_build_object('verification_source','razorpay_api')
    where audit.order_id=v_order.id and audit.event_type='payment_captured'
      and audit.metadata->>'gateway_payment_id'=p_gateway_payment_id and audit.source='payment_webhook';
  end if;
  return query select v_outcome, v_result_order;
end $$;
revoke all on function public.reconcile_razorpay_captured_payment(uuid,uuid,text,bigint,text,text) from public, anon, authenticated;
grant execute on function public.reconcile_razorpay_captured_payment(uuid,uuid,text,bigint,text,text) to service_role;
