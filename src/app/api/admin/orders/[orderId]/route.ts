import { after, NextResponse } from 'next/server'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { AdminOrderUpdateError, updateAdminOrder } from '@/lib/orders/repository'
import { deliverOrderEmailBatch } from '@/lib/orders/email-delivery'
import { readLimitedRequestBody } from '@/lib/http/read-limited-body'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

type RouteContext = { params: Promise<{ orderId: string }> }
const maxBodyBytes = 8_000
const fulfillmentStatuses = new Set(['in_production', 'shipped', 'delivered', 'cancelled'])
const paymentStatuses = new Set(['refund_pending', 'refunded'])

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
}

export async function PATCH(request: Request, context: RouteContext) {
  if (request.headers.get('origin') !== new URL(request.url).origin) {
    return json(403, { ok: false, code: 'invalid-origin', message: 'Refresh the order page and try again.' })
  }

  let account
  try {
    account = await getVerifiedCurrentAccount()
  } catch {
    return json(503, { ok: false, code: 'account-unavailable', message: 'We could not verify admin access. Try again shortly.' })
  }
  if (!account) return json(401, { ok: false, code: 'sign-in-required', message: 'Sign in with a verified admin account.' })
  if (account.role !== 'admin') return json(403, { ok: false, code: 'admin-required', message: 'Administrator access is required.' })

  const { orderId } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return json(404, { ok: false, code: 'order-not-found', message: 'This order could not be found.' })
  }

  const rawBody = await readLimitedRequestBody(request, maxBodyBytes)
  if (rawBody === null) return json(413, { ok: false, code: 'payload-too-large', message: 'Review the order update and try again.' })
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return json(400, { ok: false, code: 'invalid-payload', message: 'Review the order update and try again.' })
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { ok: false, code: 'invalid-payload', message: 'Review the order update and try again.' })

  const candidate = body as Record<string, unknown>
  const fulfillmentStatus = typeof candidate.fulfillmentStatus === 'string' && fulfillmentStatuses.has(candidate.fulfillmentStatus)
    ? candidate.fulfillmentStatus as 'in_production' | 'shipped' | 'delivered' | 'cancelled'
    : undefined
  const paymentStatus = typeof candidate.paymentStatus === 'string' && paymentStatuses.has(candidate.paymentStatus)
    ? candidate.paymentStatus as 'refund_pending' | 'refunded'
    : undefined
  if (candidate.fulfillmentStatus !== undefined && !fulfillmentStatus) return json(400, { ok: false, code: 'invalid-status', message: 'Choose a supported fulfillment status.' })
  if (candidate.paymentStatus !== undefined && !paymentStatus) return json(400, { ok: false, code: 'invalid-status', message: 'Choose a supported refund status.' })
  if (fulfillmentStatus && paymentStatus) return json(400, { ok: false, code: 'invalid-update', message: 'Update fulfillment or refund status separately.' })

  const carrier = candidate.trackingCarrier === undefined ? undefined : typeof candidate.trackingCarrier === 'string' ? candidate.trackingCarrier.trim() : null
  const trackingNumber = candidate.trackingNumber === undefined ? undefined : typeof candidate.trackingNumber === 'string' ? candidate.trackingNumber.trim() : null
  if (carrier === null || trackingNumber === null || Boolean(carrier) !== Boolean(trackingNumber) ||
    (carrier && carrier.length > 80) || (trackingNumber && trackingNumber.length > 120)) {
    return json(400, { ok: false, code: 'invalid-tracking', message: 'Enter both a carrier and a valid tracking number.' })
  }
  if ((carrier || trackingNumber) && fulfillmentStatus !== 'shipped') {
    return json(400, { ok: false, code: 'tracking-requires-shipped', message: 'Enter tracking details when marking the order shipped.' })
  }
  if (fulfillmentStatus === 'shipped' && (!carrier || !trackingNumber)) {
    return json(400, { ok: false, code: 'tracking-required', message: 'Enter the carrier and tracking number before marking an order shipped.' })
  }
  if (!fulfillmentStatus && !paymentStatus && !carrier) return json(400, { ok: false, code: 'empty-update', message: 'Choose an order update first.' })

  try {
    const outcome = await updateAdminOrder({
      orderId,
      actorId: account.id,
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(carrier && trackingNumber ? { trackingCarrier: carrier, trackingNumber } : {}),
    })
    if (outcome === 'not_found') return json(404, { ok: false, code: 'order-not-found', message: 'This order could not be found.' })
    if (outcome === 'updated' && fulfillmentStatus === 'shipped') {
      after(async () => {
        try {
          await deliverOrderEmailBatch(5)
        } catch {
          console.error('[admin/orders] order email delivery deferred', { code: 'email-outbox-unavailable' })
        }
      })
    }
    return json(200, { ok: true, outcome })
  } catch (error) {
    if (error instanceof AdminOrderUpdateError) {
      if (error.code === 'invalid-transition') return json(409, { ok: false, code: error.code, message: 'This order cannot move to that state. Refresh the page to see its latest status.' })
      if (error.code === 'forbidden') return json(403, { ok: false, code: 'admin-required', message: 'Administrator access is required.' })
    }
    console.error('[admin/orders] update failed', { code: 'order-update-unavailable' })
    return json(503, { ok: false, code: 'order-update-unavailable', message: 'The order was not updated. Try again shortly.' })
  }
}
