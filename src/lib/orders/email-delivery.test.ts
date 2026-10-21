import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.hoisted(() => vi.fn())
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: mockRpc }) }))

import { deliverOrderEmailBatch } from './email-delivery'

const claimedEmail = {
  id: 'email-123', order_id: 'order-123', recipient: 'customer@example.com', subject: 'Your card shipped',
  body_text: 'Tracking: TRACK-123', attempts: 1, claim_token: 'claim-123',
}

describe('deliverOrderEmailBatch', () => {
  beforeEach(() => {
    vi.stubEnv('IQCARD_ORDER_EMAILS_ENABLED', 'true')
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('IQCARD_ORDER_EMAIL_FROM', 'IQ Card <orders@example.com>')
    mockRpc.mockImplementation(async (name: string) => name === 'claim_paid_order_email_batch'
      ? { data: [claimedEmail], error: null }
      : { data: true, error: null })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'resend-email-123' }), { status: 200 })))
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('uses a stable provider key and completes only the claimed outbox lease', async () => {
    await expect(deliverOrderEmailBatch()).resolves.toMatchObject({ outcome: 'processed', sent: 1 })

    expect(fetch).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'order-email/email-123' }),
    }))
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'complete_paid_order_email', {
      p_email_id: 'email-123', p_claim_token: 'claim-123', p_success: true, p_error: null,
    })
  })
})
