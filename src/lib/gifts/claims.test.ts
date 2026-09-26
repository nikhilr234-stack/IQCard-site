import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createServerClient } from '@/lib/supabase/server'
import { claimOwnGiftProfile, discoverOwnGiftProfile } from './claims'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

describe('gift profile claims', () => {
  const rpc = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockResolvedValue({ rpc } as never)
  })

  it('returns only the safe claim UI fields for a matching gift', async () => {
    rpc.mockResolvedValue({ data: [{ profile_id: 'profile-1', slug: 'yatish', recipient_name: 'Yatish', claimable: true }], error: null })
    await expect(discoverOwnGiftProfile()).resolves.toEqual({
      status: 'claimable',
      gift: { profileId: 'profile-1', slug: 'yatish', recipientName: 'Yatish' },
    })
    expect(rpc).toHaveBeenCalledWith('find_own_unclaimed_gift_profile')
  })

  it('returns an explicit conflict when the account already owns a profile', async () => {
    rpc.mockResolvedValue({ data: [{ profile_id: 'gift-1', slug: 'yatish', recipient_name: 'Yatish', claimable: false }], error: null })
    await expect(discoverOwnGiftProfile()).resolves.toMatchObject({ status: 'conflict', gift: { slug: 'yatish' } })
  })

  it('does not turn discovery failures into a no-gift result', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('database unavailable') })
    await expect(discoverOwnGiftProfile()).rejects.toThrow('Unable to check for a gift profile')
  })

  it('claims using the authenticated server RPC and returns the preserved identity', async () => {
    rpc.mockResolvedValue({ data: [{ profile_id: 'profile-1', slug: 'yatish', recipient_name: 'Yatish' }], error: null })
    await expect(claimOwnGiftProfile()).resolves.toEqual({ profileId: 'profile-1', slug: 'yatish', recipientName: 'Yatish' })
    expect(rpc).toHaveBeenCalledWith('claim_own_gift_profile')
  })
})
