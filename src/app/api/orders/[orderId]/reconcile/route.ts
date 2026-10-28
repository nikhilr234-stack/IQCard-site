import { createHash, createHmac } from 'node:crypto'
import { NextResponse } from 'next/server'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getOrderForOwner } from '@/lib/orders/repository'
import { getOrderCheckoutConfig } from '@/lib/orders/checkout-config'
import { findCapturedRazorpayPayment } from '@/lib/orders/razorpay'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type RouteContext = { params: Promise<{ orderId: string }> }
const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })

export async function POST(request: Request, context: RouteContext) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json(403, { ok: false, code: 'invalid-origin' })
  let stage = 'account'
  try {
    const account = await getVerifiedCurrentAccount()
    if (!account) return json(401, { ok: false, code: 'sign-in-required' })
    const availability = getOrderCheckoutConfig()
    if (!availability.ready) return json(503, { ok: false, code: 'sandbox-unavailable' })
    const { orderId } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return json(404, { ok: false, code: 'order-not-found' })
    stage = 'order'
    const order = await getOrderForOwner(orderId, account.id)
    if (!order) return json(404, { ok: false, code: 'order-not-found' })
    if (!['pending', 'failed'].includes(order.payment_status)) return json(200, { ok: true, outcome: 'unchanged' })
    if (!order.gateway_order_id) return json(200, { ok: true, outcome: 'pending' })
    const client = createAdminClient()
    stage = 'rate-limit'
    const { data: allowed, error: limitError } = await client.rpc('consume_registration_rate_limit', {
      p_key_hash: createHmac('sha256', availability.config.keySecret).update(`payment-recovery:${account.id}:${order.id}`).digest('hex'),
      p_window_seconds: 30, p_maximum: 1,
    })
    if (limitError || typeof allowed !== 'boolean') throw new Error('Rate limiter unavailable')
    if (!allowed) return json(429, { ok: false, code: 'try-later' })
    // No payment facts from the browser are accepted. The gateway order comes from the owned row.
    stage = 'provider-verification'
    const payment = await findCapturedRazorpayPayment(order.gateway_order_id, order.total_paise, availability.config)
    if (!payment) return json(200, { ok: true, outcome: 'pending' })
    stage = 'database-processing'
    const { data, error } = await client.rpc('reconcile_razorpay_captured_payment', {
      p_order_id: order.id, p_owner_id: account.id, p_gateway_payment_id: payment.id,
      p_amount_paise: payment.amount, p_currency: payment.currency,
      p_payload_sha256: createHash('sha256').update(JSON.stringify(payment)).digest('hex'),
    })
    if (error) {
      console.error('[orders] payment recovery processor failed', { code: /^(?:[A-Z0-9]{5}|PGRST\d{3})$/.test(error.code ?? '') ? error.code : 'database-error' })
      throw new Error('Payment processor unavailable')
    }
    const outcome = (Array.isArray(data) ? data[0] : data)?.outcome
    if (!['processed', 'duplicate', 'ignored'].includes(outcome)) return json(409, { ok: false, code: 'payment-not-reconciled' })
    console.info('[orders] payment recovery completed', { outcome })
    return json(200, { ok: true, outcome })
  } catch {
    console.error('[orders] payment recovery unavailable', { code: 'verification-unavailable', stage })
    return json(503, { ok: false, code: 'verification-unavailable' })
  }
}
