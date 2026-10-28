import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVerifiedCurrentAccount: vi.fn(),
  confirmPaidOrderProfileForOwner: vi.fn(),
  getOwnProfileDestination: vi.fn(),
}))

vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: mocks.getVerifiedCurrentAccount }))
vi.mock('@/lib/orders/repository', () => ({ confirmPaidOrderProfileForOwner: mocks.confirmPaidOrderProfileForOwner, getOwnProfileDestination: mocks.getOwnProfileDestination }))

import { POST } from './route'

const orderId = '11111111-1111-4111-8111-111111111111'
const context = { params: Promise.resolve({ orderId }) }

function request(origin = 'https://iqcard.in', body?: unknown) {
  return new Request(`https://iqcard.in/api/orders/${orderId}/profile`, {
    method: 'POST',
    headers: { origin, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

describe('POST /api/orders/[orderId]/profile', () => {
  beforeEach(() => {
    mocks.getVerifiedCurrentAccount.mockReset().mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', role: 'client' })
    mocks.confirmPaidOrderProfileForOwner.mockReset().mockResolvedValue({ outcome: 'confirmed', profileId: 'profile-1', profileSlug: 'sample-profile' })
    mocks.getOwnProfileDestination.mockReset().mockResolvedValue({ id: 'profile-1', slug: 'sample-profile', status: 'published' })
  })

  it('confirms the published profile using the verified account, with no browser-selected profile id', async () => {
    const response = await POST(request('https://iqcard.in', { profileId: 'attacker-selected-id' }), context)

    expect(response.status).toBe(200)
    expect(mocks.confirmPaidOrderProfileForOwner).toHaveBeenCalledWith(orderId, 'owner-1')
    expect(await response.json()).toMatchObject({ ok: true, profileId: 'profile-1', profileSlug: 'sample-profile' })
  })

  it('rejects cross-origin, unsigned, and malformed requests before updating an order', async () => {
    expect((await POST(request('https://attacker.example'), context)).status).toBe(403)
    mocks.getVerifiedCurrentAccount.mockResolvedValueOnce(null)
    expect((await POST(request(), context)).status).toBe(401)
    expect((await POST(request(), { params: Promise.resolve({ orderId: 'bad-id' }) })).status).toBe(404)
    expect(mocks.confirmPaidOrderProfileForOwner).not.toHaveBeenCalled()
  })

  it('explains when no published profile is ready', async () => {
    mocks.confirmPaidOrderProfileForOwner.mockResolvedValue({ outcome: 'profile_not_ready', profileId: null, profileSlug: null })

    const response = await POST(request(), context)

    expect(response.status).toBe(409)
    expect((await response.json()).code).toBe('profile-not-ready')
  })

  it.each(['order_not_ready', 'unexpected'])('rejects an unconfirmed database outcome: %s', async outcome => {
    mocks.confirmPaidOrderProfileForOwner.mockResolvedValue({ outcome, profileId: null, profileSlug: null })
    const response = await POST(request(), context)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ ok: false, code: 'profile-confirmation-unavailable' })
  })

  it('rejects a previously confirmed destination that has been unpublished', async () => {
    mocks.getOwnProfileDestination.mockResolvedValue({ id: 'profile-1', slug: 'sample-profile', status: 'draft' })
    const response = await POST(request(), context)
    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ ok: false, code: 'profile-not-ready' })
  })
})
