import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createServerClient } from '@/lib/supabase/server'
import {
  getOwnProfile,
  getOwnProfilePresentation,
  getPublishedProfile,
  getPublishedProfilePresentation,
} from './repository'
import { DEFAULT_PRESENTATION } from './presentation'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

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

function profileClient() {
  const maybeSingle = vi.fn().mockResolvedValue({ data: storedProfile, error: null })
  const createSignedUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.example/bearer-token' }, error: null })
  return {
    from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })), maybeSingle })) })) })),
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
    createSignedUrl,
  }
}

describe('profile photo delivery URLs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('gives an owner an internal authenticated photo URL without minting a bearer URL', async () => {
    const client = profileClient()
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    const profile = await getOwnProfile({ id: 'owner-1', email: 'owner@example.com' })

    expect(profile.photo_url).toBe('/api/profile-photo?path=owner-1%2Fportrait.png')
    expect(client.createSignedUrl).not.toHaveBeenCalled()
  })

  it('gives a public profile the same application-controlled exact-path URL', async () => {
    const client = profileClient()
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    const profile = await getPublishedProfile('owner')

    expect(profile?.photo_url).toBe('/api/profile-photo?path=owner-1%2Fportrait.png')
    expect(client.createSignedUrl).not.toHaveBeenCalled()
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
  beforeEach(() => vi.clearAllMocks())

  it('falls back to Minimal defaults when a legacy profile has no presentation row', async () => {
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
    })
  })
})
