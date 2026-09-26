import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { createServerClient } from '@/lib/supabase/server'
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

  function editableClient(rpc: ReturnType<typeof vi.fn>, draft: unknown = null) {
    const from = vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => table === 'profiles'
          ? { single: vi.fn().mockResolvedValue({ data: { id: 'profile-1', slug: 'owner' }, error: null }) }
          : { maybeSingle: vi.fn().mockResolvedValue({ data: draft === null ? null : { draft }, error: null }) }),
      })),
    }))
    return { from, rpc }
  }

  it('saves a normalized draft without invoking the profile publication RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServerClient).mockResolvedValue(editableClient(rpc) as never)
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
      },
    })
    expect(rpc).not.toHaveBeenCalledWith('complete_own_onboarding_publish', expect.anything())
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/digital-profile')
  })

  it('restores the exact stored gift media keys when saving safe browser-facing media URLs', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const savedDraft = {
      template: 'cover',
      cover: { coverPath: 'gift/profile-1/cover-a.webp', photoPathOverride: 'gift/profile-1/portrait-b.png', overlay: 0.38, focalY: 50, alignment: 'center' },
    }
    vi.mocked(createServerClient).mockResolvedValue(editableClient(rpc, savedDraft) as never)
    const formData = new FormData()
    formData.set('presentation', JSON.stringify({
      template: 'cover',
      cover: { coverPath: '/api/gift-media?slug=owner&asset=cover', photoPathOverride: '/api/gift-media?slug=owner&asset=portrait', overlay: 0.4, focalY: 40, alignment: 'center' },
    }))

    await savePresentationDraft(formData)

    expect(rpc).toHaveBeenCalledWith('save_own_profile_presentation', { p_draft: {
      template: 'cover',
      cover: { coverPath: 'gift/profile-1/cover-a.webp', photoPathOverride: 'gift/profile-1/portrait-b.png', overlay: 0.4, focalY: 40, alignment: 'center' },
    } })
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
