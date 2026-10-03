import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRazorpayOrder, findRazorpayOrderByReceipt } from './razorpay'

const config = { mode: 'test' as const, keyId: 'rzp_test_public', keySecret: 'server-secret', webhookSecret: 'webhook-secret', shippingPaise: 12500, taxPaise: 0 }

afterEach(() => vi.unstubAllGlobals())

describe('Razorpay sandbox client', () => {
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
