import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getVerifiedCurrentAccount: vi.fn(),
  getOrderForOwner: vi.fn(),
  getOwnProfileDestination: vi.fn(),
}))

vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: mocks.getVerifiedCurrentAccount }))
vi.mock('@/lib/orders/repository', () => ({ getOrderForOwner: mocks.getOrderForOwner, getOwnProfileDestination: mocks.getOwnProfileDestination }))

import { GET } from './route'

const context = { params: Promise.resolve({ orderId: '11111111-1111-4111-8111-111111111111' }) }

describe('owned order status API', () => {
  beforeEach(() => {
    mocks.getVerifiedCurrentAccount.mockReset().mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', role: 'client' })
    mocks.getOrderForOwner.mockReset().mockResolvedValue({
      id: '11111111-1111-4111-8111-111111111111',
      profile_id: 'profile-1',
      order_number: 'IQ-261003-000001', owner_id: 'owner-1',
      client_request_key: '7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10',
      design_id: 'IQD-ABC123', email: 'owner@example.com', phone: '+919000000000',
      shipping_address: { recipientName: 'Test Customer', line1: '1 Test Street', country: 'IN' },
      card_subtotal_paise: 79_900, shipping_paise: 12_500, tax_paise: 0,
      total_paise: 92_400, payment_status: 'pending', fulfillment_status: 'unfulfilled',
      card_snapshot: { privateLogo: 'must-not-be-returned' },
    })
    mocks.getOwnProfileDestination.mockReset().mockResolvedValue({ id: 'profile-1', slug: 'sample-profile', status: 'published' })
  })

  it('returns only the signed-in owner’s resumable order details without caching', async () => {
    const response = await GET(new Request('https://iqcard.in/api/orders/11111111-1111-4111-8111-111111111111'), context)

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(mocks.getOrderForOwner).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111', 'owner-1')
    const result = await response.json()
    expect(result).toMatchObject({
      ok: true,
      order: {
        id: '11111111-1111-4111-8111-111111111111', number: 'IQ-261003-000001',
        requestKey: '7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10', designId: 'IQD-ABC123',
        paymentStatus: 'pending', cardSubtotalPaise: 79_900, shippingPaise: 12_500, taxPaise: 0, totalPaise: 92_400,
        profileId: 'profile-1', profileConfirmed: true,
        shippingAddress: { country: 'IN' }, phone: '+919000000000',
      },
    })
    expect(JSON.stringify(result)).not.toContain('must-not-be-returned')
    expect(JSON.stringify(result)).not.toContain('owner@example.com')
  })

  it('does not disclose an order when the user is unsigned or the order is not owned', async () => {
    mocks.getVerifiedCurrentAccount.mockResolvedValue(null)
    expect((await GET(new Request('https://iqcard.in/api/orders/11111111-1111-4111-8111-111111111111'), context)).status).toBe(401)
    mocks.getVerifiedCurrentAccount.mockResolvedValue({ id: 'owner-2', email: 'other@example.com', role: 'client' })
    mocks.getOrderForOwner.mockResolvedValue(null)
    expect((await GET(new Request('https://iqcard.in/api/orders/11111111-1111-4111-8111-111111111111'), context)).status).toBe(404)
  })

  it('rejects a malformed order identifier before querying the repository', async () => {
    const response = await GET(new Request('https://iqcard.in/api/orders/not-an-id'), { params: Promise.resolve({ orderId: 'not-an-id' }) })

    expect(response.status).toBe(404)
    expect(mocks.getOrderForOwner).not.toHaveBeenCalled()
  })
})
