import { NextResponse } from 'next/server'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getOrderForOwner, getOwnProfileDestination } from '@/lib/orders/repository'

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
