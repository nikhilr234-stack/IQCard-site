import { NextResponse } from 'next/server'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getOrderCheckoutConfig } from '@/lib/orders/checkout-config'
import { createOrderCheckout, OrderCheckoutError } from '@/lib/orders/checkout-service'
import { validateOrderCheckoutRequest } from '@/lib/orders/checkout-validation'
import { attachRazorpayOrder, createOrGetPendingOrder, getClaimedSavedDesign, getOrderByRequestKeyForOwner, releaseRazorpayOrderCreation, reserveRazorpayOrderCreation } from '@/lib/orders/repository'
import { createRazorpayOrder, findRazorpayOrderByReceipt } from '@/lib/orders/razorpay'
import { checkOrderRateLimit } from '@/lib/registration/rate-limit'
import { readLimitedRequestBody } from '@/lib/http/read-limited-body'

export const runtime = 'nodejs'

const maxCheckoutBytes = 16_000

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, code, message }, { status, headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
}

export async function GET(request: Request) {
  let account
  try {
    account = await getVerifiedCurrentAccount()
  } catch {
    return jsonError(503, 'account-unavailable', 'We could not verify your account. Try again shortly.')
  }
  if (!account) return jsonError(401, 'sign-in-required', 'Sign in with your verified email to continue.')

  const requestKey = new URL(request.url).searchParams.get('requestKey')?.toLowerCase() ?? ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestKey)) {
    return jsonError(400, 'invalid-request-key', 'We could not load this checkout. Start again from your saved card.')
  }

  try {
    const order = await getOrderByRequestKeyForOwner(account.id, requestKey)
    if (!order) return jsonError(404, 'order-not-found', 'No saved checkout was found for this card.')
    const availability = getOrderCheckoutConfig()
    const canResumePayment = availability.ready && ['pending', 'failed'].includes(order.payment_status) && Boolean(order.gateway_order_id)
    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        number: order.order_number,
        requestKey: order.client_request_key,
        designId: order.design_id,
        cardSnapshot: order.card_snapshot,
        phone: order.phone,
        shippingAddress: order.shipping_address,
        paymentStatus: order.payment_status,
        fulfillmentStatus: order.fulfillment_status,
        cardSubtotalPaise: order.card_subtotal_paise,
        shippingPaise: order.shipping_paise,
        taxPaise: order.tax_paise,
        totalPaise: order.total_paise,
      },
      ...(canResumePayment ? { payment: { keyId: availability.config.keyId, orderId: order.gateway_order_id, amountPaise: order.total_paise, currency: 'INR' } } : {}),
    }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } })
  } catch {
    console.error('[orders] checkout resume failed', { code: 'order-lookup-unavailable' })
    return jsonError(503, 'order-unavailable', 'We could not load this checkout. Try again shortly.')
  }
}

export async function POST(request: Request) {
  const requestOrigin = request.headers.get('origin')
  if (!requestOrigin || requestOrigin !== new URL(request.url).origin) {
    return jsonError(403, 'invalid-origin', 'Refresh this page and try again.')
  }

  let account
  try {
    account = await getVerifiedCurrentAccount()
  } catch {
    return jsonError(503, 'account-unavailable', 'We could not verify your account. Try again shortly.')
  }
  if (!account) return jsonError(401, 'sign-in-required', 'Sign in with your verified email to continue.')

  const availability = getOrderCheckoutConfig()
  if (!availability.ready) {
    console.warn('[orders] checkout configuration gate', { reason: availability.reason })
    const disabled = availability.reason === 'disabled' || availability.reason === 'sandbox-only' || availability.reason === 'preview-only'
    return jsonError(
      503,
      disabled ? 'checkout-disabled' : 'checkout-unavailable',
      disabled ? 'Checkout is not enabled yet. Your saved card design is safe.' : 'Checkout is temporarily unavailable.',
    )
  }

  try {
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const rateLimit = await checkOrderRateLimit({ email: account.email, ip: forwardedFor })
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { ok: false, code: 'checkout-rate-limited', message: 'Too many checkout attempts. Wait a little and try again.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
      )
    }
  } catch {
    console.error('[orders] checkout rate limit unavailable', { code: 'rate-limit-unavailable' })
    return jsonError(503, 'checkout-unavailable', 'Checkout is temporarily unavailable.')
  }

  const rawBody = await readLimitedRequestBody(request, maxCheckoutBytes)
  if (rawBody === null) {
    return jsonError(413, 'payload-too-large', 'Review the checkout information and try again.')
  }

  let candidate: unknown
  try {
    candidate = JSON.parse(rawBody)
  } catch {
    return jsonError(400, 'invalid-payload', 'Review the checkout information and try again.')
  }

  const validation = validateOrderCheckoutRequest(candidate)
  if (!validation.ok) {
    return NextResponse.json({ ok: false, code: 'invalid-checkout', field: validation.field, message: validation.message }, { status: 400 })
  }

  try {
    const result = await createOrderCheckout(account, validation.value, availability.config, {
      getSavedDesign: getClaimedSavedDesign,
      createOrGetOrder: createOrGetPendingOrder,
      findOrderByRequestKey: getOrderByRequestKeyForOwner,
      findProviderOrder: findRazorpayOrderByReceipt,
      createProviderOrder: createRazorpayOrder,
      attachProviderOrder: attachRazorpayOrder,
      reserveProviderOrderCreation: reserveRazorpayOrderCreation,
      releaseProviderOrderCreation: releaseRazorpayOrderCreation,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    if (error instanceof OrderCheckoutError) return jsonError(error.status, error.code, error.message)
    console.error('[orders] checkout initialization failed', { code: 'unexpected-error' })
    return jsonError(503, 'checkout-unavailable', 'We could not start checkout. Your saved design is safe to retry.')
  }
}
