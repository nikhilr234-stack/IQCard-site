import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVerifiedCurrentAccount: vi.fn(),
  getOrderCheckoutConfig: vi.fn(),
  createOrderCheckout: vi.fn(),
  checkOrderRateLimit: vi.fn(),
}))

vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: mocks.getVerifiedCurrentAccount }))
vi.mock('@/lib/orders/checkout-config', () => ({ getOrderCheckoutConfig: mocks.getOrderCheckoutConfig }))
vi.mock('@/lib/orders/checkout-service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/orders/checkout-service')>()
  return { ...actual, createOrderCheckout: mocks.createOrderCheckout }
})
vi.mock('@/lib/orders/repository', () => ({
  attachRazorpayOrder: vi.fn(), createOrGetPendingOrder: vi.fn(), getClaimedSavedDesign: vi.fn(), getOrderByRequestKeyForOwner: vi.fn(),
  reserveRazorpayOrderCreation: vi.fn(), releaseRazorpayOrderCreation: vi.fn(),
}))
vi.mock('@/lib/orders/razorpay', () => ({ createRazorpayOrder: vi.fn(), findRazorpayOrderByReceipt: vi.fn() }))
vi.mock('@/lib/registration/rate-limit', () => ({ checkOrderRateLimit: mocks.checkOrderRateLimit }))

import { GET, POST } from './route'

const validBody = JSON.stringify({
  requestKey: '7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10',
  designId: 'IQD-ABC123',
  phone: '9000000000',
  shippingAddress: {
    recipientName: 'Test Customer', line1: '1 Test Street', line2: '',
    locality: 'Test Locality', city: 'Test City', state: 'Test State', postalCode: '123456', country: 'IN',
  },
  amountPaise: 1,
  email: 'attacker@example.com',
})

function request(body = validBody, origin = 'https://iqcard.in') {
  return new Request('https://iqcard.in/api/orders', {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body,
  })
}

describe('paid order API', () => {
  beforeEach(() => {
    mocks.getVerifiedCurrentAccount.mockReset().mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', role: 'client' })
    mocks.getOrderCheckoutConfig.mockReset().mockReturnValue({
      ready: true,
      config: { mode: 'test', keyId: 'rzp_test_public', keySecret: 'server-secret', shippingPaise: 12500, taxPaise: 0 },
    })
    mocks.createOrderCheckout.mockReset().mockResolvedValue({
      kind: 'checkout',
      order: { id: 'order-id', number: 'IQ-261003-000001', paymentStatus: 'pending', phone: '+919000000000', shippingAddress: { recipientName: 'Test Customer', line1: '1 Test Street', country: 'IN' }, cardSubtotalPaise: 79_900, shippingPaise: 12_500, taxPaise: 0, totalPaise: 92_400 },
      payment: { keyId: 'rzp_test_public', orderId: 'order_provider123', amountPaise: 92400, currency: 'INR' },
    })
    mocks.checkOrderRateLimit.mockReset().mockResolvedValue({ allowed: true })
  })

  it('resumes an existing checkout using an owner-scoped idempotency key', async () => {
    const { getOrderByRequestKeyForOwner } = await import('@/lib/orders/repository')
    vi.mocked(getOrderByRequestKeyForOwner).mockResolvedValue({
      id: 'order-id', order_number: 'IQ-261003-000001', owner_id: 'owner-1',
      client_request_key: '7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10',
      email: 'owner@example.com', phone: '+919000000000', design_id: 'IQD-ABC123',
      card_snapshot: {}, shipping_address: { country: 'IN' }, currency: 'INR', pricing_version: 'flat-inr-v2',
      card_subtotal_paise: 79900, shipping_paise: 12500, tax_paise: 0, total_paise: 92400,
      payment_status: 'pending', fulfillment_status: 'unfulfilled', payment_provider: 'razorpay', gateway_order_id: 'order_provider123',
    })

    const response = await GET(new Request('https://iqcard.in/api/orders?requestKey=7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(vi.mocked(getOrderByRequestKeyForOwner)).toHaveBeenCalledWith('owner-1', '7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10')
    expect(await response.json()).toMatchObject({ order: { id: 'order-id', paymentStatus: 'pending', cardSubtotalPaise: 79_900, shippingPaise: 12_500, taxPaise: 0, totalPaise: 92_400, shippingAddress: { country: 'IN' } } })
  })

  it('requires a same-origin request and a verified signed-in account', async () => {
    expect((await POST(request(validBody, 'https://attacker.example'))).status).toBe(403)
    mocks.getVerifiedCurrentAccount.mockResolvedValue(null)
    const response = await POST(request())
    expect(response.status).toBe(401)
    expect(mocks.createOrderCheckout).not.toHaveBeenCalled()
  })

  it('keeps payment unavailable when the sandbox configuration is absent', async () => {
    mocks.getOrderCheckoutConfig.mockReturnValue({ ready: false, reason: 'disabled' })

    const response = await POST(request())

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'checkout-disabled' })
    expect(mocks.createOrderCheckout).not.toHaveBeenCalled()
  })

  it('applies the durable per-email and per-IP checkout limit before creating an order', async () => {
    mocks.checkOrderRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 600 })

    const response = await POST(request())

    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('600')
    expect(mocks.createOrderCheckout).not.toHaveBeenCalled()
  })

  it('validates request data and ignores browser-supplied amount and email', async () => {
    const response = await POST(request())
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(mocks.createOrderCheckout).toHaveBeenCalledWith(
      { id: 'owner-1', email: 'owner@example.com', role: 'client' },
      expect.objectContaining({ designId: 'IQD-ABC123', phone: '+919000000000' }),
      expect.objectContaining({ shippingPaise: 12500, taxPaise: 0 }),
      expect.objectContaining({ getSavedDesign: expect.any(Function), createOrGetOrder: expect.any(Function) }),
    )
    expect(result).toMatchObject({ ok: true, payment: { keyId: 'rzp_test_public' } })
    expect(JSON.stringify(result)).not.toContain('server-secret')
  })

  it('rejects malformed or oversized request bodies before starting an order', async () => {
    expect((await POST(request('{'))).status).toBe(400)
    expect((await POST(request('x'.repeat(16_001)))).status).toBe(413)
    expect(mocks.createOrderCheckout).not.toHaveBeenCalled()
  })
})
