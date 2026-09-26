import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { GET } from './route'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

function makeClient(options: {
  profile?: Record<string, unknown> | null
  presentation?: Record<string, unknown> | null
  blob?: Blob | null
} = {}) {
  const download = vi.fn().mockResolvedValue({ data: options.blob ?? new Blob(['bytes'], { type: 'image/png' }), error: null })
  const presentationMaybeSingle = vi.fn().mockResolvedValue({ data: options.presentation ?? null, error: null })
  const profile = Object.hasOwn(options, 'profile') ? options.profile : { id: 'profile-1', photo_path: 'gift/profile-1/portrait.png' }
  const profileMaybeSingle = vi.fn().mockResolvedValue({ data: profile, error: null })
  const from = vi.fn((table: string) => {
    if (table === 'gift-media') return { download }
    if (table === 'profile_presentations') {
      return { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: presentationMaybeSingle })) })) }
    }
    return { select: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: profileMaybeSingle })) })) })) }
  })
  return { storage: { from }, from, download, profileMaybeSingle, presentationMaybeSingle }
}

describe('private gift media route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('serves a portrait only after resolving its path from a published profile', async () => {
    const client = makeClient()
    vi.mocked(createAdminClient).mockReturnValue(client as never)

    const response = await GET(new Request('https://iqcard.in/api/gift-media?slug=yatish-p&asset=portrait'))

    expect(client.from).toHaveBeenCalledWith('profiles')
    expect(client.profileMaybeSingle).toHaveBeenCalled()
    expect(client.from).toHaveBeenCalledWith('gift-media')
    expect(client.download).toHaveBeenCalledWith('gift/profile-1/portrait.png')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(await response.text()).toBe('bytes')
  })

  it('serves a Cover only when the published presentation references it', async () => {
    const client = makeClient({
      profile: { id: 'profile-1', photo_path: null },
      presentation: { published: { template: 'cover', cover: { coverPath: 'gift/profile-1/cover.webp' } } },
      blob: new Blob(['cover'], { type: 'image/webp' }),
    })
    vi.mocked(createAdminClient).mockReturnValue(client as never)

    const response = await GET(new Request('https://iqcard.in/api/gift-media?slug=yatish-p&asset=cover'))

    expect(client.from).toHaveBeenCalledWith('profile_presentations')
    expect(client.download).toHaveBeenCalledWith('gift/profile-1/cover.webp')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
  })

  it.each([
    ['raw arbitrary path', 'path=gift%2Fprofile-1%2Fsecret.png'],
    ['invalid asset kind', 'slug=yatish-p&asset=claim'],
    ['invalid slug', 'slug=../secret&asset=portrait'],
  ])('rejects %s without downloading from Storage', async (_label, query) => {
    const client = makeClient()
    vi.mocked(createAdminClient).mockReturnValue(client as never)

    const response = await GET(new Request(`https://iqcard.in/api/gift-media?${query}`))

    expect(response.status).toBe(404)
    expect(client.download).not.toHaveBeenCalled()
  })

  it.each([
    ['no published profile', { profile: null }],
    ['no portrait reference', { profile: { id: 'profile-1', photo_path: null } }],
    ['path belonging to a different profile', { profile: { id: 'profile-1', photo_path: 'gift/other-profile/portrait.png' } }],
  ])('does not serve portrait for %s', async (_label, options) => {
    const client = makeClient(options)
    vi.mocked(createAdminClient).mockReturnValue(client as never)

    const response = await GET(new Request('https://iqcard.in/api/gift-media?slug=yatish-p&asset=portrait'))

    expect(response.status).toBe(404)
    expect(client.download).not.toHaveBeenCalled()
  })

  it.each([
    ['an unrelated presentation', { template: 'cover', cover: { coverPath: 'gift/other-profile/cover.webp' } }],
    ['a different template', { template: 'minimal', cover: { coverPath: 'gift/profile-1/cover.webp' } }],
  ])('does not serve cover when it is not published and referenced (%s)', async (_label, presentation) => {
    const client = makeClient({ profile: { id: 'profile-1' }, presentation: { published: presentation } })
    vi.mocked(createAdminClient).mockReturnValue(client as never)

    const response = await GET(new Request('https://iqcard.in/api/gift-media?slug=yatish-p&asset=cover'))

    expect(response.status).toBe(404)
    expect(client.download).not.toHaveBeenCalled()
  })
})
