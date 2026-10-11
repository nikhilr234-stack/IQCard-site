import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRazorpayOrder, findRazorpayOrderByReceipt, findCapturedRazorpayPayment } from './razorpay'

const config = { mode: 'test' as const, keyId: 'rzp_test_public', keySecret: 'server-secret', webhookSecret: 'webhook-secret', shippingPaise: 12500, taxPaise: 0 }

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('Razorpay sandbox client', () => {
  it('records a transport failure without logging the thrown message', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('private transport message')))
    await expect(findRazorpayOrderByReceipt('IQ-261003-000001', config)).rejects.toThrow('private transport message')
    expect(log).toHaveBeenCalledWith('[orders] Razorpay transport failed', { code: 'network-error' })
    expect(JSON.stringify(log.mock.calls)).not.toContain('private transport message')
  })
  it('records the provider HTTP status without logging its body or credentials', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('private provider response', { status: 401 })))

    await expect(findRazorpayOrderByReceipt('IQ-261003-000001', config)).rejects.toThrow('Razorpay request failed (401)')

    expect(log).toHaveBeenCalledWith('[orders] Razorpay request failed', { status: 401 })
    expect(JSON.stringify(log.mock.calls)).not.toContain('private provider response')
    expect(JSON.stringify(log.mock.calls)).not.toContain(config.keySecret)
  })
  it('creates an INR order using the configured sandbox key and verifies amount/currency', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'order_test123', amount: 92400, currency: 'INR', receipt: 'IQ-261003-000001' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await createRazorpayOrder({ amount: 92400, currency: 'INR', receipt: 'IQ-261003-000001', notes: { local_order_id: 'local-id' } }, config)

    expect(result).toMatchObject({ id: 'order_test123', amount: 92400, currency: 'INR' })
    expect(fetchMock).toHaveBeenCalledWith('https://api.razorpay.com/v1/orders', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: `Basic ${Buffer.from('rzp_test_public:server-secret').toString('base64')}` }),
    }))
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('server-secret')
  })

  it('looks up attached gateway IDs directly and receipts through the order collection', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'order_existing123', amount: 92400, currency: 'INR' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ id: 'order_receipt123', amount: 92400, currency: 'INR' }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await findRazorpayOrderByReceipt('order_existing123', config)
    await findRazorpayOrderByReceipt('IQ-261003-000001', config)

    expect(fetchMock.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/orders/order_existing123')
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.razorpay.com/v1/orders?receipt=IQ-261003-000001')
  })

  it('rejects a mismatched provider amount and unsafe receipt before creating an order', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'order_test123', amount: 1, currency: 'INR' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createRazorpayOrder({ amount: 92400, currency: 'INR', receipt: 'IQ-261003-000001', notes: {} }, config)).rejects.toThrow('Invalid payment provider response')
    await expect(createRazorpayOrder({ amount: 92400, currency: 'INR', receipt: 'bad/receipt', notes: {} }, config)).rejects.toThrow('Invalid payment order')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})

const captured = { id: 'pay_real', order_id: 'order_real', amount: 79900, currency: 'INR', status: 'captured', captured: true, amount_refunded: 0 }
describe('captured payment verification', () => {
  it('fetches payment facts from the stored gateway order', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [captured] })))
    vi.stubGlobal('fetch', fetchMock)
    expect(await findCapturedRazorpayPayment('order_real', 79900, config)).toEqual(captured)
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/orders/order_real/payments')
  })
  it.each([{ order_id: 'order_other' }, { amount: 1 }, { currency: 'USD' }, { amount_refunded: 1 }, { refund_status: 'pending' }, { captured: false }, { id: 'invalid' }])('rejects inconsistent or refunded captures: %j', async (override) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ ...captured, ...override }] }))))
    await expect(findCapturedRazorpayPayment('order_real', 79900, config)).rejects.toThrow()
  })
  it('does not treat authorization as capture', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ ...captured, status: 'authorized', captured: false }] }))))
    expect(await findCapturedRazorpayPayment('order_real', 79900, config)).toBeNull()
  })
  it('rejects malformed collections and multiple captured payments', async () => {
    const mock = vi.fn().mockResolvedValueOnce(new Response('{}')).mockResolvedValueOnce(new Response(JSON.stringify({ items: [captured, captured] })))
    vi.stubGlobal('fetch', mock)
    await expect(findCapturedRazorpayPayment('order_real', 79900, config)).rejects.toThrow()
    await expect(findCapturedRazorpayPayment('order_real', 79900, config)).rejects.toThrow()
  })
})
