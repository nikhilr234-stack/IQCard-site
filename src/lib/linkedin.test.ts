import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchLinkedInJson, isLinkedInImportConfigured, mapLinkedInProfile } from './linkedin'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('LinkedIn import', () => {
  it('stays disabled when credentials are missing', () => {
    expect(isLinkedInImportConfigured({})).toBe(false)
    expect(isLinkedInImportConfigured({ LINKEDIN_CLIENT_ID: 'id' })).toBe(false)
  })

  it('maps only basic OIDC profile fields', () => {
    expect(mapLinkedInProfile({ name: 'Nikhil Rakesh', email: 'nikhil@example.com', picture: 'https://example.com/photo.jpg', headline: 'ignored' })).toEqual({ full_name: 'Nikhil Rakesh', email: 'nikhil@example.com', picture: 'https://example.com/photo.jpg' })
  })

  it('maps a thrown provider network error to a typed temporary failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))

    await expect(fetchLinkedInJson('https://provider.example/token', {}, 1_000)).rejects.toMatchObject({
      name: 'LinkedInTemporaryFailure',
      code: 'temporary_error',
    })
  })

  it('aborts a provider request at the deadline and clears its timer', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn((_url: string | URL | Request, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true })
    })))

    const rejection = expect(fetchLinkedInJson('https://provider.example/profile', {}, 250)).rejects.toMatchObject({ code: 'temporary_error' })
    await vi.advanceTimersByTimeAsync(250)

    await rejection
    expect(vi.getTimerCount()).toBe(0)
  })

  it('returns non-OK responses without trying to parse their bodies', async () => {
    const response = new Response('<html>provider error</html>', { status: 503 })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(fetchLinkedInJson('https://provider.example/token', {}, 1_000)).resolves.toEqual({
      response,
      data: null,
    })
  })

  it('clears the deadline timer after a successful provider response', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })))

    await expect(fetchLinkedInJson<{ ok: boolean }>('https://provider.example/profile', {}, 1_000)).resolves.toMatchObject({
      data: { ok: true },
    })
    expect(vi.getTimerCount()).toBe(0)
  })
})
