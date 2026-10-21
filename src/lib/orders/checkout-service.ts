import { randomUUID } from 'node:crypto'
import { calculateOrderPrice, type ServerOrderPrice } from './pricing'
import type { ValidOrderCheckoutRequest } from './checkout-validation'

export class OrderCheckoutError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message)
    this.name = 'OrderCheckoutError'
  }
}

export type CheckoutOrder = {
  id: string
  order_number: string
  owner_id: string
  client_request_key: string
  design_id: string
  card_snapshot: Record<string, unknown>
  phone: string
  shipping_address: Readonly<Record<string, string>>
  currency: 'INR'
  pricing_version: 'flat-inr-v2'
  card_subtotal_paise: number
  shipping_paise: number
  tax_paise: number
  total_paise: number
  payment_status: string
  fulfillment_status: string
  payment_provider: string | null
  gateway_order_id: string | null
}

export type ProviderOrder = { id: string; amount: number; currency: string }

export type CheckoutDependencies = {
  getSavedDesign(ownerId: string, designId: string): Promise<{ design_id: string; design_payload: unknown } | null>
  createOrGetOrder(input: {
    ownerId: string; email: string; requestKey: string; designId: string; cardSnapshot: Record<string, unknown>
    phone: string; shippingAddress: ValidOrderCheckoutRequest['shippingAddress']; price: ServerOrderPrice
  }): Promise<CheckoutOrder>
  findOrderByRequestKey(ownerId: string, requestKey: string): Promise<CheckoutOrder | null>
  findProviderOrder(receipt: string): Promise<ProviderOrder | null>
  createProviderOrder(input: { amount: number; currency: 'INR'; receipt: string; notes: Record<string, string> }): Promise<ProviderOrder>
  attachProviderOrder(orderId: string, leaseToken: string, providerOrder: ProviderOrder): Promise<boolean>
  reserveProviderOrderCreation(orderId: string, leaseToken: string): Promise<boolean>
  releaseProviderOrderCreation(orderId: string, leaseToken: string): Promise<void>
}

function priceFromOrder(order: CheckoutOrder): ServerOrderPrice {
  return {
    cardSubtotalPaise: order.card_subtotal_paise,
    shippingPaise: order.shipping_paise,
    taxPaise: order.tax_paise,
    totalPaise: order.total_paise,
    currency: 'INR',
    pricingVersion: 'flat-inr-v2',
  }
}

function isOpen(order: CheckoutOrder) {
  return ['pending', 'failed'].includes(order.payment_status) && !['cancelled', 'delivered'].includes(order.fulfillment_status)
}

async function providerOrderFor(order: CheckoutOrder, dependencies: CheckoutDependencies): Promise<ProviderOrder> {
  if (order.gateway_order_id) {
    const attached = await dependencies.findProviderOrder(order.gateway_order_id)
    if (attached) return attached
    throw new OrderCheckoutError(503, 'provider-order-unavailable', 'The existing payment session could not be resumed. Try again shortly.')
  }

  const leaseToken = randomUUID()
  const reserved = await dependencies.reserveProviderOrderCreation(order.id, leaseToken)
  if (!reserved) throw new OrderCheckoutError(409, 'checkout-in-progress', 'This checkout is already being prepared. Refresh in a few seconds.')
  try {
    // A previous request may have created the provider order but lost its response
    // before the database attachment. Recover and attach it while holding the lease.
    const recovered = await dependencies.findProviderOrder(order.order_number)
    const provider = recovered ?? await dependencies.createProviderOrder({
      amount: order.total_paise,
      currency: 'INR',
      receipt: order.order_number,
      notes: { local_order_id: order.id, owner_id: order.owner_id },
    })
    if (provider.amount !== order.total_paise || provider.currency !== 'INR') {
      throw new OrderCheckoutError(503, 'provider-order-invalid', 'The payment service returned an invalid order. Try again shortly.')
    }
    const attached = await dependencies.attachProviderOrder(order.id, leaseToken, provider)
    if (!attached) {
      throw new OrderCheckoutError(409, 'checkout-in-progress', 'This checkout is already being prepared. Refresh in a few seconds.')
    }
    return provider
  } catch (error) {
    await dependencies.releaseProviderOrderCreation(order.id, leaseToken).catch(() => undefined)
    throw error
  }
}

export async function createOrderCheckout(
  account: { id: string; email: string },
  request: ValidOrderCheckoutRequest,
  config: { mode: 'test'; keyId: string; keySecret: string; shippingPaise: number; taxPaise: number },
  dependencies: CheckoutDependencies,
) {
  // Idempotency is resolved before touching the editable design or address.
  let order = await dependencies.findOrderByRequestKey(account.id, request.requestKey)
  if (order) {
    if (!isOpen(order)) throw new OrderCheckoutError(409, 'order-not-payable', 'This saved order is no longer available for payment.')
  } else {
    const design = await dependencies.getSavedDesign(account.id, request.designId)
    if (!design || design.design_id !== request.designId) throw new OrderCheckoutError(404, 'saved-card-not-found', 'We could not find this saved card. Refresh your saved designs and try again.')
    const price = calculateOrderPrice(design.design_payload, { shippingPaise: config.shippingPaise, taxPaise: config.taxPaise })
    if (!price) throw new OrderCheckoutError(400, 'invalid-saved-card', 'This saved card needs to be updated before checkout.')
    order = await dependencies.createOrGetOrder({
      ownerId: account.id, email: account.email, requestKey: request.requestKey, designId: design.design_id,
      cardSnapshot: price.cardSnapshot, phone: request.phone, shippingAddress: request.shippingAddress, price,
    })
    if (!isOpen(order)) throw new OrderCheckoutError(409, 'order-not-payable', 'This saved order is no longer available for payment.')
  }

  const provider = await providerOrderFor(order, dependencies)
  return {
    kind: 'checkout' as const,
    order: {
      id: order.id,
      number: order.order_number,
      paymentStatus: order.payment_status,
      phone: order.phone,
      shippingAddress: order.shipping_address,
      ...priceFromOrder(order),
    },
    payment: { keyId: config.keyId, orderId: provider.id, amountPaise: provider.amount, currency: 'INR' as const },
  }
}
