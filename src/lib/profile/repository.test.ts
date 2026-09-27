import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPublicClient, createServerClient } from '@/lib/supabase/server'
import {
  getOwnProfile,
  getOwnProfilePresentation,
  getPublishedProfile,
  getPublishedProfilePresentation,
  getPublishedProfilePresentationBySlug,
} from './repository'
import { DEFAULT_PRESENTATION } from './presentation'
import { DEFAULT_PROFILE_DESIGN } from './design'

const { unstableCache } = vi.hoisted(() => ({
  unstableCache: vi.fn((reader: () => unknown) => reader),
}))

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn(), createPublicClient: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: unstableCache }))

const storedProfile = {
  id: 'profile-1',
  owner_id: 'owner-1',
  slug: 'owner',
  status: 'published',
  full_name: 'Owner Name',
  headline: '',
  tagline: '',
  bio: '',
  phone: '',
  email: 'owner@example.com',
  whatsapp: '',
  location: '',
  public_email_visible: false,
  phone_visible: false,
  whatsapp_visible: false,
  location_visible: false,
  photo_path: 'owner-1/portrait.png',
  published_at: '2026-09-01T00:00:00Z',
  profile_links: [],
}

function profileClient(profile = storedProfile) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null })
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.example/bearer-token' }, error: null })
  return {
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })), maybeSingle })) })) })),
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
    createSignedUrl,
  }
}

describe('profile photo delivery URLs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockReset()
    vi.mocked(createPublicClient).mockReset()
  })

  it('gives an owner an internal authenticated photo URL without minting a bearer URL', async () => {
    const client = profileClient()
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    const profile = await getOwnProfile({ id: 'owner-1', email: 'owner@example.com' })

    expect(profile.photo_url).toBe('/api/profile-photo?path=owner-1%2Fportrait.png')
    expect(client.createSignedUrl).not.toHaveBeenCalled()
  })

  it('gives a public profile the same application-controlled exact-path URL', async () => {
    const client = profileClient()
    vi.mocked(createPublicClient).mockReturnValue(client as never)

    const profile = await getPublishedProfile('owner')

    expect(profile?.photo_url).toBe('/api/profile-photo?path=owner-1%2Fportrait.png')
    expect(client.createSignedUrl).not.toHaveBeenCalled()
    expect(createServerClient).not.toHaveBeenCalled()
    expect(unstableCache).toHaveBeenCalledWith(expect.any(Function), ['published-profile', 'owner'], {
      revalidate: 60,
      tags: ['published-profile:owner'],
    })
  })

  it('does not serialize internal gift-media paths into a public profile DTO', async () => {
    const giftProfile = { ...storedProfile, slug: 'yatish-p', photo_path: 'gift/profile-1/portrait.png' }
    vi.mocked(createPublicClient).mockReturnValue(profileClient(giftProfile) as never)

    const profile = await getPublishedProfile('yatish-p')

    expect(profile?.photo_path).toBeNull()
    expect(profile?.photo_url).toBe('/api/gift-media?slug=yatish-p&asset=portrait')
  })

  it('creates a new owner draft only through the server-controlled draft RPC', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    const rpc = vi.fn().mockResolvedValue({ data: { ...storedProfile, status: 'draft' }, error: null })
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })),
      })),
      rpc,
    } as never)

    await getOwnProfile({ id: 'owner-1', email: 'owner@example.com' })

    expect(rpc).toHaveBeenCalledWith('create_own_profile_draft', { p_full_name: null })
  })
})

describe('profile presentation readers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createServerClient).mockReset()
    vi.mocked(createPublicClient).mockReset()
  })

  it('falls back to Cover defaults when a legacy profile has no presentation row', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    } as never)

    await expect(getPublishedProfilePresentation('profile-1')).resolves.toEqual(DEFAULT_PRESENTATION.published)
  })

  it('reads a public presentation directly by slug so it can load alongside the profile', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { published: { template: 'minimal', cover: {} } }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    vi.mocked(createPublicClient).mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq })),
      })),
    } as never)

    await expect(getPublishedProfilePresentationBySlug('owner')).resolves.toMatchObject({ template: 'minimal' })
    expect(eq).toHaveBeenCalledWith('slug', 'owner')
    expect(createServerClient).not.toHaveBeenCalled()
    expect(unstableCache).toHaveBeenCalledWith(expect.any(Function), ['published-presentation', 'owner'], {
      revalidate: 60,
      tags: ['published-profile:owner'],
    })
  })

  it('replaces private gift paths with slug-and-asset URLs before returning a public presentation', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { published: { template: 'cover', cover: { coverPath: 'gift/profile-1/cover.webp', photoPathOverride: 'gift/profile-1/portrait.png' } } },
      error: null,
    })
    vi.mocked(createPublicClient).mockReturnValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })),
    } as never)

    const presentation = await getPublishedProfilePresentationBySlug('yatish-p')

    expect(presentation.cover.coverPath).toBe('/api/gift-media?slug=yatish-p&asset=cover')
    expect(presentation.cover.photoPathOverride).toBe('/api/gift-media?slug=yatish-p&asset=portrait')
    expect(JSON.stringify(presentation)).not.toContain('gift/profile-1')
  })

  it('uses stable gift-media URLs for claimed owners without exposing the private object key', async () => {
    const giftProfile = { ...storedProfile, owner_id: 'owner-1', photo_path: 'gift/profile-1/portrait.webp' }
    const maybeSingle = vi.fn().mockResolvedValue({ data: giftProfile, error: null })
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })), maybeSingle })) })) })),
    } as never)

    const profile = await getOwnProfile({ id: 'owner-1', email: 'owner@example.com' })

    expect(profile.photo_path).toBeNull()
    expect(profile.photo_url).toBe('/api/gift-media?slug=owner&asset=portrait')
  })

  it('does not treat a failed public presentation query as a legacy profile', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('presentation query failed') })
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    } as never)

    await expect(getPublishedProfilePresentation('profile-1')).rejects.toThrow('presentation query failed')
  })

  it('keeps public Minimal profiles available while the presentation migration is pending', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '42P01', message: 'relation "profile_presentations" does not exist' },
    })
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    } as never)

    await expect(getPublishedProfilePresentation('profile-1')).resolves.toEqual(DEFAULT_PRESENTATION.published)
  })

  it('normalizes a saved owner draft before returning it', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        draft: {
          template: 'cover',
          cover: { coverPath: 'owner-1/cover.jpg', overlay: 9, focalY: -3, alignment: 'center' },
        },
        published: { template: 'minimal', cover: {} },
      },
      error: null,
    })
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    } as never)

    await expect(getOwnProfilePresentation('owner-1')).resolves.toEqual({
      template: 'cover',
      cover: {
        coverPath: 'owner-1/cover.jpg',
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
    })
  })

  it('does not treat a failed owner presentation query as a legacy profile', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: new Error('owner presentation query failed') })
    vi.mocked(createServerClient).mockResolvedValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      })),
    } as never)

    await expect(getOwnProfilePresentation('owner-1')).rejects.toThrow('owner presentation query failed')
  })
})
