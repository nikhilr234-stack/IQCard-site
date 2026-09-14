import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ requireAuthenticatedAccount: vi.fn() }))
const server = vi.hoisted(() => ({ createServerClient: vi.fn() }))
const cookieState = vi.hoisted(() => ({
  get: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/lib/auth/account', () => auth)
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({ siteUrl: 'https://iqcard.example' }) }))
vi.mock('@/lib/supabase/server', () => server)
vi.mock('next/headers', () => ({ cookies: async () => cookieState }))

import { GET } from './route'

function callbackRequest() {
  return new Request('https://iqcard.example/auth/linkedin/callback?code=oauth-code&state=expected-state')
}

function profileClient({ queryError = null, updateError = null }: { queryError?: Error | null; updateError?: Error | null } = {}) {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: updateError }) }))
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: queryError ? null : { id: 'profile-1', status: 'draft' }, error: queryError }) })),
      })),
      update,
    })),
  }
}

beforeEach(() => {
  process.env.LINKEDIN_CLIENT_ID = 'client-id'
  process.env.LINKEDIN_CLIENT_SECRET = 'client-secret'
  auth.requireAuthenticatedAccount.mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', role: 'client' })
  cookieState.get.mockReturnValue({ value: 'expected-state' })
  cookieState.delete.mockReset()
  server.createServerClient.mockResolvedValue(profileClient())
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  delete process.env.LINKEDIN_CLIENT_ID
  delete process.env.LINKEDIN_CLIENT_SECRET
})

describe('LinkedIn callback provider failures', () => {
  it('maps a thrown token request to a temporary error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network offline')))

    const response = await GET(callbackRequest())

    expect(response.headers.get('location')).toBe('https://iqcard.example/dashboard?linkedin=temporary_error')
  })

  it('maps a non-OK token response without requesting the profile', async () => {
    const providerFetch = vi.fn().mockResolvedValue(new Response(null, { status: 502 }))
    vi.stubGlobal('fetch', providerFetch)

    const response = await GET(callbackRequest())

    expect(response.headers.get('location')).toBe('https://iqcard.example/dashboard?linkedin=token_error')
    expect(providerFetch).toHaveBeenCalledTimes(1)
  })

  it('maps a thrown profile request to a temporary error', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }))
      .mockRejectedValueOnce(new TypeError('profile network error')))

    const response = await GET(callbackRequest())

    expect(response.headers.get('location')).toBe('https://iqcard.example/dashboard?linkedin=temporary_error')
  })

  it('maps a non-OK profile response to a profile error', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 })))

    const response = await GET(callbackRequest())

    expect(response.headers.get('location')).toBe('https://iqcard.example/dashboard?linkedin=profile_error')
  })

  it('does not swallow authentication redirects', async () => {
    const redirectSignal = new Error('NEXT_REDIRECT')
    auth.requireAuthenticatedAccount.mockRejectedValue(redirectSignal)
    const providerFetch = vi.fn()
    vi.stubGlobal('fetch', providerFetch)

    await expect(GET(callbackRequest())).rejects.toBe(redirectSignal)
    expect(providerFetch).not.toHaveBeenCalled()
  })

  it('does not relabel unexpected application errors as provider failures', async () => {
    const databaseError = new Error('database unavailable')
    server.createServerClient.mockRejectedValue(databaseError)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'Nikhil Rakesh' }), { status: 200 })))

    await expect(GET(callbackRequest())).rejects.toBe(databaseError)
  })

  it('does not misclassify a returned profile query error as a publication-state error', async () => {
    server.createServerClient.mockResolvedValue(profileClient({ queryError: new Error('query failed') }))
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 'token' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ name: 'Nikhil Rakesh' }), { status: 200 })))

    const response = await GET(callbackRequest())

    expect(response.headers.get('location')).toBe('https://iqcard.example/dashboard?linkedin=save_error')
  })
})
