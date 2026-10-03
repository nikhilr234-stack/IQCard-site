import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ValidOrderCheckoutRequest } from './checkout-validation'
import type { ServerOrderPrice } from './pricing'
import type { RazorpayOrder } from './razorpay'

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refund_pending' | 'refunded'
export type FulfillmentStatus = 'unfulfilled' | 'awaiting_profile' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'
export type OrderStatusEvent = {
  id: string; event_type: string; source: string; actor_email?: string | null; created_at: string
  previous_payment_status: string | null; new_payment_status: string | null
  previous_fulfillment_status: string | null; new_fulfillment_status: string | null
  previous_tracking_carrier: string | null; new_tracking_carrier: string | null
  previous_tracking_number: string | null; new_tracking_number: string | null
}

export type OrderRecord = {
  id: string; order_number: string; owner_id: string; client_request_key: string; email: string; phone: string
  design_id: string; card_snapshot: Record<string, unknown>; shipping_address: Readonly<Record<string, string>>
  profile_id?: string | null; currency: 'INR'; pricing_version: 'flat-inr-v2'; card_subtotal_paise: number; shipping_paise: number
  tax_paise: number; total_paise: number; payment_status: PaymentStatus; fulfillment_status: FulfillmentStatus
  payment_provider: string | null; gateway_order_id: string | null; tracking_carrier?: string | null; tracking_number?: string | null
  created_at?: string
  profileDestination?: { id: string; slug: string; status: string } | null
}

const db = () => createAdminClient() as any

function fail(error: unknown, message: string): never {
  console.error(`[orders] ${message}`, error && typeof error === 'object' && 'code' in error ? { code: (error as { code: unknown }).code } : {})
  throw new Error(message)
}

export async function getClaimedSavedDesign(ownerId: string, designId: string) {
  const { data, error } = await db().from('registration_intents').select('design_id,design_payload')
    .eq('owner_id', ownerId).eq('design_id', designId).eq('status', 'claimed').order('claimed_at', { ascending: false }).limit(1).maybeSingle()
  if (error) fail(error, 'Unable to load saved card')
  if (data) return data as { design_id: string; design_payload: unknown }
  // Older verified-email handoffs remain active when onboarding v2 is disabled.
  const { data: handoff, error: handoffError } = await db().from('checkout_handoffs').select('design_id,payload')
    .eq('owner_id', ownerId).eq('design_id', designId).not('claimed_at', 'is', null).order('claimed_at', { ascending: false }).limit(1).maybeSingle()
  if (handoffError) fail(handoffError, 'Unable to load saved card')
  return handoff ? { design_id: handoff.design_id, design_payload: handoff.payload } : null
}

export async function createOrGetPendingOrder(input: {
  ownerId: string; email: string; requestKey: string; designId: string; cardSnapshot: Record<string, unknown>
  phone: string; shippingAddress: ValidOrderCheckoutRequest['shippingAddress']; price: ServerOrderPrice
}): Promise<OrderRecord> {
  const { data, error } = await db().rpc('create_or_get_pending_paid_order', {
    p_owner_id: input.ownerId, p_email: input.email.trim().toLowerCase(), p_request_key: input.requestKey,
    p_design_id: input.designId, p_card_snapshot: input.cardSnapshot, p_phone: input.phone,
    p_shipping_address: input.shippingAddress, p_card_subtotal_paise: input.price.cardSubtotalPaise,
    p_shipping_paise: input.price.shippingPaise, p_tax_paise: input.price.taxPaise, p_total_paise: input.price.totalPaise,
    p_currency: input.price.currency, p_pricing_version: input.price.pricingVersion,
  })
  if (error || !data) fail(error ?? new Error('No order returned'), 'Unable to save checkout')
  return (Array.isArray(data) ? data[0] : data) as OrderRecord
}

export async function getOrderByRequestKeyForOwner(ownerId: string, requestKey: string): Promise<OrderRecord | null> {
  const { data, error } = await db().from('paid_orders').select('*').eq('owner_id', ownerId).eq('client_request_key', requestKey).maybeSingle()
  if (error) fail(error, 'Unable to load saved checkout')
  return data as OrderRecord | null
}

export async function getOrderForOwner(orderId: string, ownerId: string): Promise<OrderRecord | null> {
  const { data, error } = await db().from('paid_orders').select('*').eq('id', orderId).eq('owner_id', ownerId).maybeSingle()
  if (error) fail(error, 'Unable to load order')
  return data as OrderRecord | null
}

export async function getLatestOpenOrderForDesign(ownerId: string, designId: string): Promise<OrderRecord | null> {
  const { data, error } = await db().from('paid_orders').select('*').eq('owner_id', ownerId).eq('design_id', designId)
    .eq('payment_status', 'pending').order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) fail(error, 'Unable to load open order')
  return data as OrderRecord | null
}

export async function reserveRazorpayOrderCreation(orderId: string, leaseToken: string): Promise<boolean> {
  const { data, error } = await db().rpc('reserve_paid_order_provider_creation', {
    p_order_id: orderId, p_lease_token: leaseToken, p_lease_seconds: 120,
  })
  if (error || typeof data !== 'boolean') fail(error ?? new Error('Invalid reservation response'), 'Unable to reserve payment order')
  return data
}

export async function attachRazorpayOrder(orderId: string, leaseToken: string, providerOrder: RazorpayOrder): Promise<boolean> {
  const { data, error } = await db().rpc('attach_paid_order_provider_order', {
    p_order_id: orderId, p_lease_token: leaseToken, p_gateway_order_id: providerOrder.id,
    p_gateway_amount_paise: providerOrder.amount, p_gateway_currency: providerOrder.currency,
  })
  if (error || typeof data !== 'boolean') fail(error ?? new Error('Invalid attachment response'), 'Unable to attach payment order')
  return data
}

export async function releaseRazorpayOrderCreation(orderId: string, leaseToken: string): Promise<void> {
  const { error } = await db().rpc('release_paid_order_provider_creation', { p_order_id: orderId, p_lease_token: leaseToken })
  if (error) fail(error, 'Unable to release payment-order reservation')
}

export async function getOwnProfileDestination(ownerId: string) {
  const { data, error } = await db().from('profiles').select('id,slug,status').eq('owner_id', ownerId).maybeSingle()
  if (error) fail(error, 'Unable to load profile destination')
  return data as { id: string; slug: string; status: string } | null
}

export async function confirmPaidOrderProfileForOwner(orderId: string, ownerId: string) {
  const { data, error } = await db().rpc('confirm_paid_order_profile_for_owner', { p_order_id: orderId, p_owner_id: ownerId })
  if (error) fail(error, 'Unable to confirm order destination')
  const result = Array.isArray(data) ? data[0] : data
  return { outcome: result?.outcome ?? 'profile_not_ready', profileId: result?.profile_id ?? null, profileSlug: result?.profile_slug ?? null }
}

export async function listAdminOrders(): Promise<OrderRecord[]> {
  const { data, error } = await db().from('paid_orders').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) fail(error, 'Unable to load order queue')
  const orders = (data ?? []) as OrderRecord[]
  await attachProfileDestinations(orders)
  return orders
}

async function attachProfileDestinations(orders: OrderRecord[]) {
  const ids = [...new Set(orders.map((order) => order.profile_id).filter((id): id is string => Boolean(id)))]
  if (!ids.length) return
  const { data, error } = await db().from('profiles').select('id,slug,status').in('id', ids)
  if (error) fail(error, 'Unable to load profile destinations')
  const destinations = new Map((data ?? []).map((item: any) => [item.id, item]))
  for (const order of orders) Object.assign(order, { profileDestination: order.profile_id ? destinations.get(order.profile_id) ?? null : null })
}

export async function getAdminOrderDetails(orderId: string): Promise<{ order: OrderRecord; events: OrderStatusEvent[]; profileDestination: { id: string; slug: string; status: string } | null } | null> {
  const { data: order, error } = await db().from('paid_orders').select('*').eq('id', orderId).maybeSingle()
  if (error) fail(error, 'Unable to load order details')
  if (!order) return null
  const { data: events, error: eventsError } = await db().from('paid_order_status_events').select('*').eq('order_id', orderId).order('created_at', { ascending: true })
  if (eventsError) fail(eventsError, 'Unable to load order history')
  let profileDestination = null
  if (order.profile_id) {
    const { data, error: profileError } = await db().from('profiles').select('id,slug,status').eq('id', order.profile_id).maybeSingle()
    if (profileError) fail(profileError, 'Unable to load profile destination')
    profileDestination = data
  }
  return { order: order as OrderRecord, events: (events ?? []) as OrderStatusEvent[], profileDestination }
}

export class AdminOrderUpdateError extends Error {
  constructor(readonly code: 'invalid-transition' | 'not-found' | 'forbidden' = 'invalid-transition') { super(code); this.name = 'AdminOrderUpdateError' }
}

export async function updateAdminOrder(input: {
  orderId: string; actorId: string; paymentStatus?: 'refund_pending' | 'refunded'; fulfillmentStatus?: string
  trackingCarrier?: string; trackingNumber?: string
}): Promise<'updated' | 'not_found'> {
  const { data, error } = await db().rpc('admin_update_paid_order', {
    p_order_id: input.orderId, p_actor_id: input.actorId, p_payment_status: input.paymentStatus ?? null,
    p_fulfillment_status: input.fulfillmentStatus ?? null, p_tracking_carrier: input.trackingCarrier ?? null,
    p_tracking_number: input.trackingNumber ?? null,
  })
  if (error) fail(error, 'Unable to update order')
  const result = Array.isArray(data) ? data[0] : data
  if (result === true || result?.outcome === 'updated') return 'updated'
  if (result?.outcome === 'not_found') return 'not_found'
  if (result?.outcome === 'forbidden') throw new AdminOrderUpdateError('forbidden')
  throw new AdminOrderUpdateError('invalid-transition')
}

export async function getRazorpayOrderLeaseToken() { return randomUUID() }
