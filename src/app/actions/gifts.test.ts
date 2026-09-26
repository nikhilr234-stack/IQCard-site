import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAdminAccount } from '@/lib/auth/account'
import { cleanupGiftMedia, uploadGiftMedia } from '@/lib/gifts/media'
import { createGiftProfile } from '@/lib/gifts/create'
import { createAdminClient } from '@/lib/supabase/admin'
import { createGift, updateGiftDetails } from './gifts'

vi.mock('@/lib/auth/account', () => ({ requireAdminAccount: vi.fn() }))
vi.mock('@/lib/gifts/media', () => ({ uploadGiftMedia: vi.fn(), cleanupGiftMedia: vi.fn() }))
vi.mock('@/lib/gifts/create', () => ({ createGiftProfile: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({ siteUrl: 'https://iqcard.in' }) }))

function validGiftForm() {
  const form = new FormData()
  for (const [key, value] of Object.entries({
    fullName: 'Yatish P', email: 'YATISH@example.com', role: 'Driver',
    tagline: 'Ready for the grid', phone: '+91 98765 43210', whatsapp: '+91 98765 43210',
    location: 'Bengaluru', linkedin: 'https://linkedin.com/in/yatish', website: 'https://yatish.example',
  })) form.set(key, value)
  return form
}

describe('Gift Factory server actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdminAccount).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
    vi.mocked(uploadGiftMedia).mockResolvedValue({ photoPath: null, coverPath: null, uploadedPaths: [] })
    vi.mocked(createGiftProfile).mockResolvedValue({ profileId: '123e4567-e89b-12d3-a456-426614174000', slug: 'yatish-p' })
  })

  it('requires admin authorization before uploads or profile creation', async () => {
    vi.mocked(requireAdminAccount).mockRejectedValue(new Error('not an admin'))

    await expect(createGift(validGiftForm())).rejects.toThrow('not an admin')

    expect(uploadGiftMedia).not.toHaveBeenCalled()
    expect(createGiftProfile).not.toHaveBeenCalled()
  })

  it('rejects invalid links before any upload', async () => {
    const form = validGiftForm()
    form.set('website', 'javascript:alert(1)')

    await expect(createGift(form)).resolves.toMatchObject({ ok: false, error: 'Use an HTTP(S) link or a contact link.' })

    expect(uploadGiftMedia).not.toHaveBeenCalled()
    expect(createGiftProfile).not.toHaveBeenCalled()
  })

  it('maps valid inputs and returns the generated live URL', async () => {
    const result = await createGift(validGiftForm())

    expect(result).toEqual({ ok: true, name: 'Yatish P', slug: 'yatish-p', profileId: '123e4567-e89b-12d3-a456-426614174000', url: 'https://iqcard.in/yatish-p' })
    expect(createGiftProfile).toHaveBeenCalledWith(expect.objectContaining({
      fullName: 'Yatish P', recipientEmail: 'yatish@example.com', role: 'Driver',
      photoPath: null, coverPath: null,
      links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/yatish' }, { label: 'Website', url: 'https://yatish.example' }],
    }))
  })

  it('reports claimed gifts as read-only and does not expose database errors', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('private claim table details') })
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)
    const form = new FormData()
    for (const [key, value] of Object.entries({ profileId: 'gift-id', fullName: 'Yatish P', role: 'Driver' })) form.set(key, value)

    await expect(updateGiftDetails(form)).resolves.toEqual({ ok: false, error: 'This gift may already be claimed, or the details could not be saved.' })
    expect(rpc).toHaveBeenCalledWith('admin_update_unclaimed_gift_profile', expect.objectContaining({ p_profile_id: 'gift-id' }))
  })
})
