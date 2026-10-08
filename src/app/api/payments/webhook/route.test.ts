import { createHash, createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  getRazorpayWebhookSecret: vi.fn(() => 'webhook-secret'),
  isRazorpayWebhookAvailable: vi.fn(() => true),
  deliverOrderEmailBatch: vi.fn(async () => ({ outcome: 'processed', sent: 0, retried: 0, failed: 0 })),
  after: vi.fn((callback: () => void) => { void callback() }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ rpc: mocks.rpc }),
}))

vi.mock('@/lib/orders/checkout-config', () => ({
  getRazorpayWebhookSecret: mocks.getRazorpayWebhookSecret,
  isRazorpayWebhookAvailable: mocks.isRazorpayWebhookAvailable,
}))
vi.mock('@/lib/orders/email-delivery', () => ({ deliverOrderEmailBatch: mocks.deliverOrderEmailBatch }))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: mocks.after,
}))

import { POST } from './route'

const body = JSON.stringify({
  event: 'payment.captured',
  payload: { payment: { entity: {
    id: 'pay_capture123', order_id: 'order_test123', amount: 92400, currency: 'INR', status: 'captured',
  } } },
})

function request(rawBody = body, options: { signature?: string; eventId?: string } = {}) {
  const signature = options.signature ?? createHmac('sha256', 'webhook-secret').update(rawBody).digest('hex')
  return new Request('https://iqcard.in/api/payments/webhook', {
    method: 'POST',
    headers: {
      ...(signature ? { 'x-razorpay-signature': signature } : {}),
      ...(options.eventId !== '' ? { 'x-razorpay-event-id': options.eventId ?? 'event-1' } : {}),
    },
    body: rawBody,
  })
}

describe('Razorpay webhook route', () => {
  beforeEach(() => {
    mocks.rpc.mockReset().mockResolvedValue({ data: [{ outcome: 'processed', order_id: 'local-order-id' }], error: null })
    mocks.getRazorpayWebhookSecret.mockReturnValue('webhook-secret')
    mocks.isRazorpayWebhookAvailable.mockReturnValue(true)
    mocks.deliverOrderEmailBatch.mockReset().mockResolvedValue({ outcome: 'processed', sent: 0, retried: 0, failed: 0 })
    mocks.after.mockClear()
  })

  it('verifies the exact raw body and sends only the payment facts to the atomic processor', async () => {
    const response = await POST(request())

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true, outcome: 'processed' })
    expect(mocks.rpc).toHaveBeenCalledWith('process_razorpay_payment_event', {
      p_event_id: 'event-1',
      p_event_type: 'payment.captured',
      p_gateway_order_id: 'order_test123',
      p_gateway_payment_id: 'pay_capture123',
      p_amount_paise: 92400,
      p_currency: 'INR',
      p_payment_status: 'captured',
      p_payload_sha256: createHash('sha256').update(body).digest('hex'),
    })
    expect(mocks.after).toHaveBeenCalledOnce()
    expect(mocks.deliverOrderEmailBatch).toHaveBeenCalledWith(5)
  })

  it('rejects forged signatures before using the database', async () => {
    const response = await POST(request(body, { signature: '0'.repeat(64) }))

    expect(response.status).toBe(401)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejects signed events when the endpoint is not configured for preview sandbox payments', async () => {
    mocks.isRazorpayWebhookAvailable.mockReturnValue(false)

    const response = await POST(request())

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'webhook-not-configured' })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('rejects a missing event identifier and malformed signed JSON', async () => {
    expect((await POST(request(body, { eventId: '' }))).status).toBe(400)
    const malformed = '{'
    expect((await POST(request(malformed))).status).toBe(400)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('acknowledges unrelated signed events without changing order state', async () => {
    const unrelated = JSON.stringify({ event: 'payment.authorized', payload: {} })

    expect((await POST(request(unrelated))).status).toBe(200)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('returns a retryable error if the atomic database processor is unavailable', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: 'XX000' } })

    expect((await POST(request())).status).toBe(503)
    expect(mocks.deliverOrderEmailBatch).not.toHaveBeenCalled()
  })

  it('acknowledges payment and schedules email work after the order transaction', async () => {
    mocks.deliverOrderEmailBatch.mockRejectedValueOnce(new Error('email queue unavailable'))
    expect((await POST(request())).status).toBe(200)
    expect(mocks.after).toHaveBeenCalledOnce()
  })
})
