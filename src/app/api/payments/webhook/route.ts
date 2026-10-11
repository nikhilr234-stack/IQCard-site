import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRazorpayWebhookSecret, isRazorpayWebhookAvailable } from '@/lib/orders/checkout-config'
import { deliverOrderEmailBatch } from '@/lib/orders/email-delivery'
import { readLimitedRequestBody } from '@/lib/http/read-limited-body'

export const runtime = 'nodejs'
const maxBodyBytes = 64_000

function fail(status: number, code: string) {
  console.warn('[orders] webhook rejected', { status, code })
  return NextResponse.json({ ok: false, code }, { status, headers: { 'Cache-Control': 'no-store' } })
}

function signed(raw: string, signature: string | null, secret: string) {
  if (!signature || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(raw).digest()
  const received = Buffer.from(signature, 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function POST(request: Request) {
  const raw = await readLimitedRequestBody(request, maxBodyBytes)
  if (raw === null) return fail(413, 'payload-too-large')
  const secret = getRazorpayWebhookSecret()
  if (!secret || !isRazorpayWebhookAvailable()) return fail(503, 'webhook-not-configured')
  if (!signed(raw, request.headers.get('x-razorpay-signature'), secret)) return fail(401, 'invalid-signature')
  const eventId = request.headers.get('x-razorpay-event-id')?.trim()
  if (!eventId || eventId.length > 128 || !/^[A-Za-z0-9_-]+$/.test(eventId)) return fail(400, 'invalid-event-id')

  let body: Record<string, any>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fail(400, 'invalid-payload')
    body = parsed as Record<string, any>
  } catch {
    return fail(400, 'invalid-payload')
  }
  const eventType = body.event
  if (eventType !== 'payment.captured' && eventType !== 'payment.failed') return NextResponse.json({ ok: true, outcome: 'ignored' })
  const entity = body.payload?.payment?.entity
  if (!entity || typeof entity !== 'object' || Array.isArray(entity) ||
    typeof entity.id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(entity.id) ||
    typeof entity.order_id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(entity.order_id) ||
    !Number.isSafeInteger(entity.amount) || entity.amount < 1 || entity.currency !== 'INR' ||
    entity.status !== (eventType === 'payment.captured' ? 'captured' : 'failed')) return fail(400, 'invalid-payment')

  const { data, error } = await createAdminClient().rpc('process_razorpay_payment_event', {
    p_event_id: eventId,
    p_event_type: eventType,
    p_gateway_order_id: entity.order_id,
    p_gateway_payment_id: entity.id,
    p_amount_paise: entity.amount,
    p_currency: entity.currency,
    p_payment_status: eventType === 'payment.captured' ? 'captured' : 'failed',
    p_payload_sha256: createHash('sha256').update(raw).digest('hex'),
  })
  if (error) {
    console.error('[orders] payment event rejected', { code: error.code ?? 'database-error' })
    return fail(503, 'payment-event-unavailable')
  }
  const result = Array.isArray(data) ? data[0] : data
  const outcome = result?.outcome ?? result
  if (outcome === 'amount_mismatch' || outcome === 'order_mismatch') return fail(400, String(outcome).replaceAll('_', '-'))
  after(async () => {
    try { await deliverOrderEmailBatch(5) } catch { console.error('[orders] email outbox drain failed', { code: 'outbox-drain-failed' }) }
  })
  const loggedOutcome = ['processed', 'duplicate', 'order_not_found'].includes(outcome) ? outcome : 'acknowledged'
  console.info('[orders] webhook accepted', { outcome: loggedOutcome })
  return NextResponse.json({ ok: true, outcome: typeof outcome === 'string' ? outcome : 'processed' }, { headers: { 'Cache-Control': 'no-store' } })
}
