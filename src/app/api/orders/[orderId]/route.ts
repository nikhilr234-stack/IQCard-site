import { validateOrderCheckoutRequest } from '@/lib/orders/checkout-validation'
import { readLimitedRequestBody } from '@/lib/http/read-limited-body'
import { NextResponse } from 'next/server'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getOrderForOwner, getOwnProfileDestination, updateUnpaidDelivery } from '@/lib/orders/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ orderId: string }> }

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function GET(_request: Request, context: RouteContext) {
  let account
  try {
    account = await getVerifiedCurrentAccount()
  } catch {
    return json(503, { ok: false, code: 'account-unavailable' })
  }
  if (!account) return json(401, { ok: false, code: 'sign-in-required' })

  const { orderId } = await context.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return json(404, { ok: false, code: 'order-not-found' })
  }

  try {
    const order = await getOrderForOwner(orderId, account.id)
    if (!order) return json(404, { ok: false, code: 'order-not-found' })
    const profile = await getOwnProfileDestination(account.id)

    return json(200, {
      ok: true,
      order: {
        id: order.id,
        number: order.order_number,
        requestKey: order.client_request_key,
        designId: order.design_id,
        phone: order.phone,
        shippingAddress: order.shipping_address,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        profileId: order.profile_id ?? null,
        profileConfirmed: Boolean(order.profile_id && profile?.id === order.profile_id && profile?.status === 'published'),
        cardSubtotalPaise: order.card_subtotal_paise,
        shippingPaise: order.shipping_paise,
        taxPaise: order.tax_paise,
        totalPaise: order.total_paise,
      },
    })
  } catch {
    console.error('[orders] order lookup failed', { code: 'order-lookup-unavailable' })
    return json(503, { ok: false, code: 'order-unavailable' })
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json(403, { ok: false, message: 'Refresh checkout and try again.' })
  try {
    const account = await getVerifiedCurrentAccount()
    if (!account) return json(401, { ok: false, message: 'Sign in to correct delivery details.' })
    const { orderId } = await context.params
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) return json(404, { ok: false })
    const order = await getOrderForOwner(orderId, account.id)
    if (!order) return json(404, { ok: false, message: 'Order not found.' })
    if (!['pending', 'failed'].includes(order.payment_status) || order.fulfillment_status !== 'unfulfilled') return json(409, { ok: false, message: 'Delivery details can only be corrected before payment.' })
    const raw = await readLimitedRequestBody(request, 16_000)
    if (raw === null) return json(413, { ok: false, message: 'Delivery details are too long.' })
    let body
    try { body = JSON.parse(raw) } catch { return json(400, { ok: false, message: 'Check the delivery details and try again.' }) }
    const validated = validateOrderCheckoutRequest({ ...body, requestKey: order.client_request_key, designId: order.design_id })
    if (!validated.ok) return json(400, { ok: false, message: validated.message })
    const updated = await updateUnpaidDelivery(orderId, account.id, validated.value)
    if (!updated) return json(409, { ok: false, message: 'Order status changed. Refresh the order before continuing.' })
    return json(200, { ok: true, phone: updated.phone, shippingAddress: updated.shipping_address })
  } catch { return json(503, { ok: false, message: 'Unable to correct delivery details. Your saved order is unchanged; try again.' }) }
}
