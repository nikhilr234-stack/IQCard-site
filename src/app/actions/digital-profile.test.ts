import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { createServerClient } from '@/lib/supabase/server'
import { saveDigitalProfile } from './digital-profile'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

describe('digital profile save action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuthenticatedAccount).mockResolvedValue({
      id: 'owner-1',
      email: 'ada@example.com',
      role: 'client',
    })
  })

  function client(rpc: ReturnType<typeof vi.fn>, status: 'draft' | 'published' = 'published') {
    const from = vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => table === 'profiles'
          ? { single: vi.fn().mockResolvedValue({ data: { id: 'profile-1', slug: 'ada', status }, error: null }) }
          : { maybeSingle: vi.fn().mockResolvedValue({ data: { draft: null }, error: null }) }),
      })),
    }))
    return { from, rpc }
  }

  function formData() {
    const form = new FormData()
    form.set('profile', JSON.stringify({
      slug: 'ada', full_name: 'Ada Lovelace', headline: 'Mathematician', tagline: 'Poetical science', bio: 'Building analytical engines.',
      email: 'ada@example.com', phone: '+44123456789', whatsapp: '', location: 'London',
      public_email_visible: true, phone_visible: true, whatsapp_visible: false, location_visible: true,
    }))
    form.set('links', JSON.stringify([{ label: ' Website ', url: ' https://ada.example.com ' }]))
    form.set('presentation', JSON.stringify({
      template: 'cover',
      cover: { coverPath: 'owner-1/cover.webp', overlay: 0.38, focalY: 50, alignment: 'lower-left', photoPathOverride: null },
      whatsNext: [{ title: 'Studio launch', description: 'A new space is opening soon.', date: 'October 24', url: 'https://ada.example.com/studio' }],
    }))
    return form
  }

  it('writes identity, links, and presentation through one owner-bound database transaction', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null })
    vi.mocked(createServerClient).mockResolvedValue(client(rpc) as never)

    await expect(saveDigitalProfile(formData())).resolves.toEqual({ success: true, live: true })

    expect(requireAuthenticatedAccount).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith('save_own_digital_profile', expect.objectContaining({
      p_profile: expect.objectContaining({ full_name: 'Ada Lovelace', headline: 'Mathematician', tagline: 'Poetical science' }),
      p_links: [{ label: 'Website', url: 'https://ada.example.com' }],
      p_draft: expect.objectContaining({
        template: 'cover',
        whatsNext: [{ title: 'Studio launch', description: 'A new space is opening soon.', date: 'October 24', url: 'https://ada.example.com/studio' }],
      }),
    }))
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/digital-profile')
    expect(revalidatePath).toHaveBeenCalledWith('/ada')
  })

  it('saves unpublished profiles without making them public', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null })
    vi.mocked(createServerClient).mockResolvedValue(client(rpc, 'draft') as never)

    await expect(saveDigitalProfile(formData())).resolves.toEqual({ success: true, live: false })
    expect(rpc).toHaveBeenCalledWith('save_own_digital_profile', expect.any(Object))
  })

  it('rejects invalid links before writing any profile data', async () => {
    const rpc = vi.fn()
    vi.mocked(createServerClient).mockResolvedValue(client(rpc) as never)
    const form = formData()
    form.set('links', JSON.stringify([{ label: 'Bad link', url: 'javascript:alert(1)' }]))

    await expect(saveDigitalProfile(form)).resolves.toEqual({
      success: false,
      error: 'Use an HTTP(S) link or a contact link.',
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it('rejects an unsafe What’s next URL before writing any profile data', async () => {
    const rpc = vi.fn()
    vi.mocked(createServerClient).mockResolvedValue(client(rpc) as never)
    const form = formData()
    form.set('presentation', JSON.stringify({
      template: 'cover',
      whatsNext: [{ title: 'Launch', description: 'Coming soon', date: '', url: 'javascript:alert(1)' }],
    }))

    await expect(saveDigitalProfile(form)).resolves.toMatchObject({ success: false })
    expect(rpc).not.toHaveBeenCalled()
  })
})
