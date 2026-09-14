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
  where registration_intents.token_hash = p_token_hash
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
    where registration_intents.token_hash = p_token_hash
      and registration_intents.status = 'pending';
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
  where registration_intents.token_hash = p_token_hash
    and registration_intents.status = 'pending';

  return query select 'claimed'::text, v_intent.id::text;
end;
$$;

revoke all on function public.claim_registration_intent(text, uuid, text) from public, anon, authenticated;
grant execute on function public.claim_registration_intent(text, uuid, text) to service_role;
