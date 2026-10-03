import { afterEach, describe, expect, it, vi } from 'vitest'
import { deliverOrderEmailBatch } from '@/lib/orders/email-delivery'
import { GET } from './route'

vi.mock('@/lib/orders/email-delivery', () => ({ deliverOrderEmailBatch: vi.fn(async () => ({ outcome: 'processed', sent: 2, retried: 0, failed: 0 })) }))

function request(authorization?: string) {
  return new Request('https://iqcard.in/api/cron/order-emails', {
    headers: authorization ? { authorization } : {},
  })
}

describe('GET /api/cron/order-emails', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('rejects callers without the Vercel cron secret', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    expect((await GET(request('Bearer wrong-secret'))).status).toBe(401)
    expect(deliverOrderEmailBatch).not.toHaveBeenCalled()
  })

  it('does not query the outbox until email sending is explicitly configured', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    const response = await GET(request('Bearer cron-test-secret'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, outcome: 'disabled' })
    expect(deliverOrderEmailBatch).not.toHaveBeenCalled()
  })

  it('drains a bounded batch after both cron and email settings are configured', async () => {
    vi.stubEnv('CRON_SECRET', 'cron-test-secret')
    vi.stubEnv('IQCARD_ORDER_EMAILS_ENABLED', 'true')
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('IQCARD_ORDER_EMAIL_FROM', 'IQ Card <orders@iqcard.in>')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://iqcard.in')
    const response = await GET(request('Bearer cron-test-secret'))
    expect(response.status).toBe(200)
    expect(deliverOrderEmailBatch).toHaveBeenCalledWith(5)
  })
})
