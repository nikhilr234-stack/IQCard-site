import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createServerClient } from '@/lib/supabase/server'
import { GET } from './route'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

function storageClient(result: { data: Blob | null; error: Error | null }) {
  const download = vi.fn().mockResolvedValue(result)
  const from = vi.fn(() => ({ download }))
  return { storage: { from }, from, download }
}

describe('profile cover delivery route', () => {
  beforeEach(() => vi.clearAllMocks())

  it('delivers a published cover through the cookie-scoped RLS client and caches public image bytes briefly', async () => {
    const client = storageClient({ data: new Blob(['cover-bytes'], { type: 'image/webp' }), error: null })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    const response = await GET(new Request('https://iqcard.in/api/profile-cover?path=owner-1%2Fcover.webp'))

    expect(client.from).toHaveBeenCalledWith('profile-covers')
    expect(client.download).toHaveBeenCalledWith('owner-1/cover.webp')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect(response.headers.get('cache-control')).toContain('public')
    expect(response.headers.get('cache-control')).toContain('max-age=300')
    expect(await response.text()).toBe('cover-bytes')
  })

  it('forces an unexpected object type to download with a locked-down response', async () => {
    const client = storageClient({ data: new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), error: null })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    const response = await GET(new Request('https://iqcard.in/api/profile-cover?path=owner-1%2Fpayload.html'))

    expect(response.headers.get('content-type')).toBe('application/octet-stream')
    expect(response.headers.get('content-disposition')).toBe('attachment')
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'")
  })

  it.each([
    ['an RLS denial', { data: null, error: new Error('row-level security') }],
    ['a missing object', { data: null, error: null }],
  ])('returns the same safe not-found response for %s', async (_label, result) => {
    vi.mocked(createServerClient).mockResolvedValue(storageClient(result) as never)

    const response = await GET(new Request('https://iqcard.in/api/profile-cover?path=owner-2%2Fprivate.png'))

    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(await response.text()).not.toContain('row-level security')
  })

  it.each(['', '../secret', 'owner-1\\secret.png', '/absolute.png'])('rejects an invalid object path without querying Storage: %j', async (path) => {
    const client = storageClient({ data: new Blob(['secret']), error: null })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    const response = await GET(new Request(`https://iqcard.in/api/profile-cover?path=${encodeURIComponent(path)}`))

    expect(response.status).toBe(404)
    expect(client.from).not.toHaveBeenCalled()
  })
})
