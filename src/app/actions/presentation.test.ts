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
        design: DEFAULT_PROFILE_DESIGN,
        templateSettings: {
          cover: { variant: 'editorial-left' }, minimal: { variant: 'classic' },
          studio: { variant: 'portfolio-grid' }, executive: { variant: 'authority' },
          signal: { variant: 'poster' }, index: { variant: 'directory' },
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
      design: DEFAULT_PROFILE_DESIGN,
      templateSettings: {
        cover: { variant: 'editorial-left' }, minimal: { variant: 'classic' },
        studio: { variant: 'portfolio-grid' }, executive: { variant: 'authority' },
        signal: { variant: 'poster' }, index: { variant: 'directory' },
      },
    } })
  })

  it('persists valid Design Studio customization in the existing presentation JSON RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServerClient).mockResolvedValue(editableClient(rpc) as never)
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

  function mockOwnedProfile(status: 'draft' | 'published', slug = 'owner') {
    const single = vi.fn().mockResolvedValue({ data: { slug, status }, error: null })
    const eq = vi.fn(() => ({ single }))
    const select = vi.fn(() => ({ eq }))
    const from = vi.fn(() => ({ select }))
    return { from, select, eq, single }
  }

  it('skips onboarding publication for an already-published profile', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const profile = mockOwnedProfile('published')
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    const result = await publishPresentation()

    expect(profile.select).toHaveBeenCalledWith('slug, status')
    expect(profile.eq).toHaveBeenCalledWith('owner_id', 'owner-1')
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('publish_own_profile_presentation')
    expect(result).toEqual({ success: true })
  })

  it('revalidates the dashboard, editor, and public profile after an existing profile is updated', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const profile = mockOwnedProfile('published', 'ada')
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    const result = await publishPresentation()

    expect(result).toEqual({ success: true })
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/digital-profile')
    expect(revalidatePath).toHaveBeenCalledWith('/ada')
  })

  it('publishes an unpublished profile before promoting its presentation', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const profile = mockOwnedProfile('draft')
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    const result = await publishPresentation()

    expect(rpc).toHaveBeenNthCalledWith(1, 'complete_own_onboarding_publish', { p_publish: true })
    expect(rpc).toHaveBeenNthCalledWith(2, 'publish_own_profile_presentation')
    expect(result).toEqual({ success: true })
  })

  it('does not promote a presentation when onboarding publication fails', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ error: new Error('onboarding incomplete') })
    const profile = mockOwnedProfile('draft')
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    const result = await publishPresentation()

    expect(result).toEqual({ success: false, error: 'Unable to publish profile.' })
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns a clean success result when an already-published presentation is promoted', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const profile = mockOwnedProfile('published')
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    await expect(publishPresentation()).resolves.toEqual({ success: true })
  })

  it('surfaces a presentation RPC failure as an action result without throwing', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: new Error('promotion unavailable') })
    const profile = mockOwnedProfile('published')
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    const result = await publishPresentation()

    expect(result).toEqual({ success: false, error: 'Unable to publish presentation.' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('reports missing profiles as a normal publish failure', async () => {
    const rpc = vi.fn()
    const profile = mockOwnedProfile('draft')
    profile.single.mockResolvedValue({ data: null, error: new Error('not found') })
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    const result = await publishPresentation()

    expect(result).toEqual({ success: false, error: 'Create your profile before publishing.' })
    expect(rpc).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('revalidates all destinations after initial profile and presentation publication', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const profile = mockOwnedProfile('draft', 'ada')
    vi.mocked(createServerClient).mockResolvedValue({ from: profile.from, rpc } as never)

    await publishPresentation()

    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/digital-profile')
    expect(revalidatePath).toHaveBeenCalledWith('/ada')
  })

})
