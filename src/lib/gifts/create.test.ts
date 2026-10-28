import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGiftProfile } from './create'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

describe('createGiftProfile', () => {
  const input = {
    profileId: 'profile-123',
    fullName: 'Yatish P',
    recipientEmail: 'yatish@example.com',
    role: 'Aspiring F1 Driver',
    tagline: 'Ready for the grid',
    phone: '+91 98765 43210',
    whatsapp: '+91 98765 43210',
    location: 'Bengaluru',
    photoPath: 'gift/profile-123/portrait.webp',
    coverPath: 'gift/profile-123/cover.webp',
    links: [
      { label: 'LinkedIn', url: 'https://linkedin.com/in/yatish' },
      { label: 'Website', url: 'https://yatish.example' },
    ],
  }

  beforeEach(() => vi.clearAllMocks())

  it('does not allocate a gift to an original founder URL when normalization removes the last name', async () => {
    await expect(createGiftProfile({ ...input, fullName: 'Ashwin 张' })).rejects.toThrow('That profile URL is reserved.')
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('writes gift profile, private claim details, presentation, and links through one RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ profile_id: 'profile-123', slug: 'yatish-p' }],
      error: null,
    })
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)

    await expect(createGiftProfile(input)).resolves.toEqual({ profileId: 'profile-123', slug: 'yatish-p' })

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('admin_create_and_publish_gift_profile', {
      p_profile_id: 'profile-123',
      p_full_name: 'Yatish P',
      p_recipient_email: 'yatish@example.com',
      p_role: 'Aspiring F1 Driver',
      p_tagline: 'Ready for the grid',
      p_phone: '+91 98765 43210',
      p_whatsapp: '+91 98765 43210',
      p_location: 'Bengaluru',
      p_photo_path: 'gift/profile-123/portrait.webp',
      p_cover_path: 'gift/profile-123/cover.webp',
      p_links: input.links,
    })
  })

  it('fails with a safe message when the transaction RPC rejects', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('private database detail') })
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)

    await expect(createGiftProfile(input)).rejects.toThrow('Unable to create gift profile')
  })

  it('rejects malformed RPC output instead of returning an incomplete public identity', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { profile_id: 'profile-123' }, error: null })
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)

    await expect(createGiftProfile(input)).rejects.toThrow('Unable to create gift profile')
  })
})
