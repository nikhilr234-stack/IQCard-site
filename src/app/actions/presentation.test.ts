import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { createServerClient } from '@/lib/supabase/server'
import { DEFAULT_PROFILE_DESIGN } from '@/lib/profile/design'
import { publishPresentation, savePresentationDraft } from './presentation'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

describe('presentation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuthenticatedAccount).mockResolvedValue({
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'client',
    })
  })

  it('saves a normalized draft without invoking the profile publication RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServerClient).mockResolvedValue({ rpc } as never)
    const formData = new FormData()
    formData.set('presentation', JSON.stringify({
      template: 'cover',
      cover: { coverPath: 'owner-1/new-cover.webp', overlay: 4, focalY: -2, alignment: 'center' },
    }))

    await savePresentationDraft(formData)

    expect(rpc).toHaveBeenCalledWith('save_own_profile_presentation', {
      p_draft: {
        template: 'cover',
        cover: {
          coverPath: 'owner-1/new-cover.webp',
          overlay: 0.7,
          focalY: 0,
          alignment: 'center',
          photoPathOverride: null,
        },
        design: DEFAULT_PROFILE_DESIGN,
      },
    })
    expect(rpc).not.toHaveBeenCalledWith('complete_own_onboarding_publish', expect.anything())
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/digital-profile')
  })

  it('persists valid Design Studio customization in the existing presentation JSON RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServerClient).mockResolvedValue({ rpc } as never)
    const formData = new FormData()
    formData.set('presentation', JSON.stringify({
      template: 'studio',
      design: {
        ...DEFAULT_PROFILE_DESIGN,
        background: { color: '#123456', text: '#FFFFFF', accent: '#ABCDEF' },
        typography: { family: 'serif', scale: 'large', weight: 'bold' },
      },
    }))

    await savePresentationDraft(formData)

    expect(rpc).toHaveBeenCalledWith('save_own_profile_presentation', expect.objectContaining({
      p_draft: expect.objectContaining({
        design: expect.objectContaining({ version: 1, background: { color: '#123456', text: '#FFFFFF', accent: '#ABCDEF' }, typography: { family: 'serif', scale: 'large', weight: 'bold' } }),
      }),
    }))
  })

  it('rejects malformed presentation JSON before saving a draft', async () => {
    const rpc = vi.fn()
    vi.mocked(createServerClient).mockResolvedValue({ rpc } as never)
    const formData = new FormData()
    formData.set('presentation', '{not-json')

    await expect(savePresentationDraft(formData)).rejects.toThrow('Presentation settings could not be read.')

    expect(rpc).not.toHaveBeenCalled()
  })

  it('promotes the presentation before publishing the profile and revalidates its destinations', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { slug: 'owner' }, error: null }) })),
      })),
    }))
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)

    await publishPresentation()

    expect(rpc).toHaveBeenNthCalledWith(1, 'publish_own_profile_presentation')
    expect(rpc).toHaveBeenNthCalledWith(2, 'complete_own_onboarding_publish', { p_publish: true })
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/digital-profile')
    expect(revalidatePath).toHaveBeenCalledWith('/owner')
  })

  it('does not publish profile content when presentation promotion fails', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: new Error('promotion unavailable') })
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { slug: 'owner' }, error: null }) })),
      })),
    }))
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)

    await expect(publishPresentation()).rejects.toThrow('Unable to publish presentation.')

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
