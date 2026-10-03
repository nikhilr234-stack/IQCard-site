import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261003091439_create_paid_orders.sql'), 'utf8').toLowerCase()

describe('paid orders migration', () => {
  it('stores order snapshots, payment attempts/events, audit, and outbox with owner/admin read policies', () => {
    for (const table of ['paid_orders', 'paid_order_payment_attempts', 'paid_order_payment_events', 'paid_order_status_events', 'paid_order_email_outbox']) {
      expect(sql).toContain(`create table public.${table}`)
      expect(sql).toContain(`alter table public.${table} enable row level security`)
    }
    expect(sql).toContain('client_request_key')
    expect(sql).toContain('card_snapshot')
    expect(sql).toContain('create policy "owners read their paid orders"')
    expect(sql).toContain('public.is_current_user_admin()')
  })

  it('makes checkout creation and provider order attachment atomic and idempotent', () => {
    for (const functionName of ['create_or_get_pending_paid_order', 'reserve_paid_order_provider_creation', 'attach_paid_order_provider_order', 'release_paid_order_provider_creation']) {
      expect(sql).toContain(`function public.${functionName}`)
      expect(sql).toContain(`revoke all on function public.${functionName}`)
    }
    expect(sql).toContain('unique (owner_id, client_request_key)')
    expect(sql).toContain('provider_create_lease_until')
  })

  it('restricts payment, profile confirmation, email, and admin transitions to guarded database routines', () => {
    for (const functionName of ['process_razorpay_payment_event', 'confirm_paid_order_profile_for_owner', 'admin_update_paid_order', 'claim_paid_order_email_batch', 'complete_paid_order_email']) {
      expect(sql).toContain(`function public.${functionName}`)
      expect(sql).toContain(`revoke all on function public.${functionName}`)
    }
    expect(sql).toContain('grant execute')
    expect(sql).toContain('hashtextextended')
  })

  it('requires the current outbox claim token when completing an email attempt', () => {
    expect(sql).toContain('claim_token=gen_random_uuid()')
    expect(sql).toContain('returning o.id,o.order_id,o.recipient,o.subject,o.body_text,o.attempts,o.claim_token')
    expect(sql).toContain('p_email_id uuid, p_claim_token uuid, p_success boolean, p_error text')
    expect(sql).toContain('and claim_token=p_claim_token')
  })
})
