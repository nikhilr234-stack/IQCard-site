import { getOrderCheckoutConfig, type OrderCheckoutConfig } from './checkout-config'

export type RazorpayOrder = { id: string; amount: number; currency: string; receipt?: string; status?: string }

function credentials(config: OrderCheckoutConfig) {
  return `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`
}

function validOrder(value: unknown): RazorpayOrder | null {
  if (!value || typeof value !== 'object') return null
  const order = value as Record<string, unknown>
  return typeof order.id === 'string' && /^order_[A-Za-z0-9]+$/.test(order.id) &&
    Number.isSafeInteger(order.amount) && typeof order.currency === 'string'
    ? { id: order.id, amount: order.amount as number, currency: order.currency, ...(typeof order.receipt === 'string' ? { receipt: order.receipt } : {}), ...(typeof order.status === 'string' ? { status: order.status } : {}) }
    : null
}

async function providerRequest(path: string, init: RequestInit, config: OrderCheckoutConfig): Promise<unknown> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: { authorization: credentials(config), 'content-type': 'application/json', ...init.headers },
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  }).catch((error: unknown) => {
    console.error('[orders] Razorpay transport failed', {
      code: error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'network-error',
    })
    throw error
  })
  if (!response.ok) {
    console.error('[orders] Razorpay request failed', { status: response.status })
    throw new Error(`Razorpay request failed (${response.status})`)
  }
  return response.json()
}

export async function createRazorpayOrder(
  input: { amount: number; currency: 'INR'; receipt: string; notes: Record<string, string> },
  config: OrderCheckoutConfig = requireCheckoutConfig(),
): Promise<RazorpayOrder> {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || !/^IQ-[A-Za-z0-9-]{1,40}$/.test(input.receipt)) throw new Error('Invalid payment order')
  const value = await providerRequest('/orders', { method: 'POST', body: JSON.stringify(input) }, config)
  const order = validOrder(value)
  if (!order || order.amount !== input.amount || order.currency !== 'INR') throw new Error('Invalid payment provider response')
  return order
}

export async function findRazorpayOrderByReceipt(receipt: string, config: OrderCheckoutConfig = requireCheckoutConfig()): Promise<RazorpayOrder | null> {
  if (!/^(?:order_[A-Za-z0-9]+|IQ-[A-Za-z0-9-]{1,40})$/.test(receipt)) return null
  if (receipt.startsWith('order_')) {
    const value = await providerRequest(`/orders/${encodeURIComponent(receipt)}`, { method: 'GET' }, config)
    return validOrder(value)
  }
  const value = await providerRequest(`/orders?receipt=${encodeURIComponent(receipt)}`, { method: 'GET' }, config)
  const items = value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items) ? (value as { items: unknown[] }).items : []
  return items.map(validOrder).find((order): order is RazorpayOrder => Boolean(order)) ?? null
}

function requireCheckoutConfig(): OrderCheckoutConfig {
  const availability = getOrderCheckoutConfig()
  if (!availability.ready) throw new Error('Sandbox payment configuration is unavailable')
  return availability.config
}
