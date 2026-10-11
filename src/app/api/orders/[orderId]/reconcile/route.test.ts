import { beforeEach, describe, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({ account: vi.fn(), order: vi.fn(), config: vi.fn(), payment: vi.fn(), rpc: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: m.account }))
vi.mock('@/lib/orders/repository', () => ({ getOrderForOwner: m.order }))
vi.mock('@/lib/orders/checkout-config', () => ({ getOrderCheckoutConfig: m.config }))
vi.mock('@/lib/orders/razorpay', () => ({ findCapturedRazorpayPayment: m.payment }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: m.rpc }) }))
import { POST } from './route'
const id = '11111111-1111-4111-8111-111111111111'
const context = { params: Promise.resolve({ orderId: id }) }
const request = (origin = 'https://preview.example.com') => new Request(`https://preview.example.com/api/orders/${id}/reconcile`, { method: 'POST', headers: { origin }, body: JSON.stringify({ paymentStatus: 'paid', paymentId: 'pay_forged' }) })
describe('owned payment recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    m.account.mockResolvedValue({ id: 'owner' })
    m.order.mockResolvedValue({ id, owner_id: 'owner', gateway_order_id: 'order_real', total_paise: 79900, currency: 'INR', payment_status: 'pending' })
    m.config.mockReturnValue({ ready: true, config: { keySecret: 'private-secret' } })
    m.payment.mockResolvedValue({ id: 'pay_real', order_id: 'order_real', amount: 79900, currency: 'INR', status: 'captured', captured: true, amount_refunded: 0 })
    m.rpc.mockImplementation(async (name: string) => name === 'consume_registration_rate_limit' ? { data: true, error: null } : { data: [{ outcome: 'processed', order_id: id }], error: null })
  })
  it('recovers only provider-verified payment facts for the signed-in owner', async () => {
    const response = await POST(request(), context)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, outcome: 'processed' })
    expect(m.order).toHaveBeenCalledWith(id, 'owner')
    expect(m.payment).toHaveBeenCalledWith('order_real', 79900, expect.any(Object))
    expect(m.rpc).toHaveBeenCalledWith('reconcile_razorpay_captured_payment', expect.objectContaining({ p_order_id: id, p_owner_id: 'owner', p_gateway_payment_id: 'pay_real', p_amount_paise: 79900, p_currency: 'INR', p_payload_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) }))
    expect(JSON.stringify(m.rpc.mock.calls)).not.toContain('pay_forged')
    expect(JSON.stringify(m.rpc.mock.calls)).not.toContain('private-secret')
  })
  it('rejects cross-origin requests and unsigned users before provider calls', async () => {
    expect((await POST(request('https://other.example.com'), context)).status).toBe(403)
    m.account.mockResolvedValue(null)
    expect((await POST(request(), context)).status).toBe(401)
    expect(m.payment).not.toHaveBeenCalled()
  })
  it('does not disclose or reconcile another owner’s order', async () => {
    m.order.mockResolvedValue(null)
    expect((await POST(request(), context)).status).toBe(404)
    expect(m.payment).not.toHaveBeenCalled()
  })
  it('blocks unavailable/live configuration and malformed order identifiers', async () => {
    m.config.mockReturnValue({ ready: false })
    expect((await POST(request(), context)).status).toBe(503)
    m.config.mockReturnValue({ ready: true, config: { keySecret: 'secret' } })
    expect((await POST(request(), { params: Promise.resolve({ orderId: 'invalid' }) })).status).toBe(404)
    expect(m.payment).not.toHaveBeenCalled()
  })
  it('never reprocesses paid or refunded orders', async () => {
    for (const payment_status of ['paid', 'refunded']) {
      m.order.mockResolvedValue({ payment_status })
      expect((await POST(request(), context)).status).toBe(200)
    }
    expect(m.payment).not.toHaveBeenCalled()
    expect(m.rpc).not.toHaveBeenCalled()
  })
  it('rate limits provider checks durably', async () => {
    m.rpc.mockResolvedValue({ data: false, error: null })
    expect((await POST(request(), context)).status).toBe(429)
    expect(m.payment).not.toHaveBeenCalled()
  })
  it('keeps pending payments unchanged when no captured payment exists', async () => {
    m.payment.mockResolvedValue(null)
    expect(await (await POST(request(), context)).json()).toEqual({ ok: true, outcome: 'pending' })
    expect(m.rpc.mock.calls.map(c => c[0])).toEqual(['consume_registration_rate_limit'])
  })
  it('fails closed on provider errors and atomic amount mismatches', async () => {
    m.payment.mockRejectedValueOnce(new Error('private provider data'))
    expect((await POST(request(), context)).status).toBe(503)
    m.rpc.mockImplementation(async (name: string) => name === 'consume_registration_rate_limit' ? { data: true } : { data: [{ outcome: 'amount_mismatch' }] })
    expect((await POST(request(), context)).status).toBe(409)
  })
})
