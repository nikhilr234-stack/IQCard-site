import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { deliverOrderEmailBatch } from '@/lib/orders/email-delivery'
import { AdminOrderUpdateError, updateAdminOrder } from '@/lib/orders/repository'
import { PATCH } from './route'

const afterMock = vi.hoisted(() => vi.fn((callback: () => void) => { void callback() }))
vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: vi.fn() }))
vi.mock('@/lib/orders/email-delivery', () => ({ deliverOrderEmailBatch: vi.fn(async () => ({ outcome: 'processed', sent: 0, retried: 0, failed: 0 })) }))
vi.mock('next/server', async (importOriginal) => ({ ...(await importOriginal<typeof import('next/server')>()), after: afterMock }))
vi.mock('@/lib/orders/repository', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/orders/repository')>()),
  updateAdminOrder: vi.fn(),
}))

const orderId = '52c0dfbd-021f-4e85-8874-17bb8fb367ca'
const context = { params: Promise.resolve({ orderId }) }

function request(body: unknown, options: { origin?: string | null; id?: string } = {}) {
  return new Request(`https://iqcard.example/api/admin/orders/${options.id ?? orderId}`, {
    method: 'PATCH',
    headers: {
      origin: options.origin ?? 'https://iqcard.example',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/admin/orders/[orderId]', () => {
  beforeEach(() => {
    vi.mocked(getVerifiedCurrentAccount).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
    vi.mocked(updateAdminOrder).mockResolvedValue('updated')
    vi.mocked(deliverOrderEmailBatch).mockReset().mockResolvedValue({ outcome: 'processed', sent: 0, retried: 0, failed: 0 })
    vi.clearAllMocks()
    vi.mocked(getVerifiedCurrentAccount).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
  })

  it('requires a same-origin request and verified admin account', async () => {
    expect((await PATCH(request({ fulfillmentStatus: 'in_production' }, { origin: 'https://attacker.example' }), context)).status).toBe(403)
    vi.mocked(getVerifiedCurrentAccount).mockResolvedValueOnce(null)
    expect((await PATCH(request({ fulfillmentStatus: 'in_production' }), context)).status).toBe(401)
    vi.mocked(getVerifiedCurrentAccount).mockResolvedValueOnce({ id: 'client-1', email: 'client@example.com', role: 'client' })
    expect((await PATCH(request({ fulfillmentStatus: 'in_production' }), context)).status).toBe(403)
    expect(updateAdminOrder).not.toHaveBeenCalled()
  })

  it('requires carrier and tracking before the shipped status and rejects unsupported updates', async () => {
    const missingTracking = await PATCH(request({ fulfillmentStatus: 'shipped' }), context)
    expect(missingTracking.status).toBe(400)
    expect((await missingTracking.json()).code).toBe('tracking-required')

    const unsupported = await PATCH(request({ paymentStatus: 'paid' }), context)
    expect(unsupported.status).toBe(400)
    expect(updateAdminOrder).not.toHaveBeenCalled()
  })

  it('rejects tracking-only requests because tracking is saved with the shipped transition', async () => {
    const response = await PATCH(request({ trackingCarrier: 'DHL', trackingNumber: 'TRACK-123' }), context)

    expect(response.status).toBe(400)
    expect((await response.json()).code).toBe('tracking-requires-shipped')
    expect(updateAdminOrder).not.toHaveBeenCalled()
  })

  it('records the verified admin actor and manual tracking details through the audited update', async () => {
    const response = await PATCH(request({ fulfillmentStatus: 'shipped', trackingCarrier: 'DHL', trackingNumber: '  TRACK-123  ' }), context)
    expect(response.status).toBe(200)
    expect(updateAdminOrder).toHaveBeenCalledWith({
      orderId,
      actorId: 'admin-1',
      fulfillmentStatus: 'shipped',
      trackingCarrier: 'DHL',
      trackingNumber: 'TRACK-123',
    })
    expect(deliverOrderEmailBatch).toHaveBeenCalledWith(5)
    expect(afterMock).toHaveBeenCalledOnce()
  })

  it('reports an invalid status transition without exposing database details', async () => {
    vi.mocked(updateAdminOrder).mockRejectedValueOnce(new AdminOrderUpdateError('invalid-transition'))
    const response = await PATCH(request({ fulfillmentStatus: 'delivered' }), context)
    expect(response.status).toBe(409)
    expect((await response.json()).message).toContain('Refresh')
  })
})
