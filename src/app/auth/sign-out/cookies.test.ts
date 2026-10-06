import { afterEach, expect, it, vi } from 'vitest'
import { POST } from './route'
import { createServerClient } from '@/lib/supabase/server'

const { entries, setCookie } = vi.hoisted(() => ({
  entries: [] as { name: string; value: string }[],
  setCookie: vi.fn(),
}))
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ getAll: () => entries, set: setCookie })) }))
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({
  supabaseUrl: 'https://sandbox.example.com', supabaseAnonKey: 'test-publishable-key', siteUrl: 'https://preview.example.com',
}) }))

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); entries.length = 0 })

it('uses the real Supabase SSR client to expire session cookies and revoke only that session', async () => {
  const session = {
    access_token: 'test-access-token', refresh_token: 'test-refresh-token', token_type: 'bearer',
    expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: 'owner-1', email: 'owner@example.com' },
  }
  entries.push({ name: 'sb-sandbox-auth-token', value: `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}` })
  setCookie.mockImplementation((name: string, value: string) => {
    const index = entries.findIndex(entry => entry.name === name)
    if (index >= 0) entries.splice(index, 1)
    if (value) entries.push({ name, value })
  })
  const fetch = vi.fn(async (_url: string | URL | Request, _options?: RequestInit) => new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetch)

  const response = await POST(new Request('https://preview.example.com/auth/sign-out', {
    method: 'POST', headers: { Origin: 'https://preview.example.com' },
  }))

  expect(response.status).toBe(303)
  expect(response.headers.get('location')).toBe('https://preview.example.com/login')
  expect(fetch).toHaveBeenCalledTimes(1)
  expect(fetch.mock.calls[0][0]).toBe('https://sandbox.example.com/auth/v1/logout?scope=local')
  expect(setCookie).toHaveBeenCalledWith('sb-sandbox-auth-token', '', expect.objectContaining({ maxAge: 0, path: '/' }))
  const nextClient = await createServerClient()
  expect((await nextClient.auth.getSession()).data.session).toBeNull()
  expect((await nextClient.auth.getUser()).data.user).toBeNull()
})
