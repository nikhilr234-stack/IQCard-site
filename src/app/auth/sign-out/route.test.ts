import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const { signOut, createServerClient } = vi.hoisted(() => ({ signOut: vi.fn(), createServerClient: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient }))

const origin = 'https://preview.example.com'
const request = (requestOrigin: string | null = origin) => new Request(`${origin}/auth/sign-out`, {
  method: 'POST',
  headers: requestOrigin ? { Origin: requestOrigin } : {},
})

describe('sign out', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signOut.mockResolvedValue({ error: null })
    createServerClient.mockResolvedValue({ auth: { signOut } })
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  it('ends only this session and returns to login with a full page navigation', async () => {
    const response = await POST(request())
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`${origin}/login`)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it.each(['https://other.example.com', 'null', null])('rejects an untrusted or missing origin (%s)', async requestOrigin => {
    const response = await POST(request(requestOrigin))
    expect(response.status).toBe(403)
    expect(createServerClient).not.toHaveBeenCalled()
    expect(signOut).not.toHaveBeenCalled()
  })

  it('lets an already signed-out visitor return to login', async () => {
    const response = await POST(request())
    expect(response.headers.get('location')).toBe(`${origin}/login`)
  })

  it('offers a retry instead of claiming success when Supabase returns an error', async () => {
    signOut.mockResolvedValue({ error: { message: 'private provider detail' } })
    const response = await POST(request())
    expect(response.status).toBe(303)
    expect(response.headers.get('location')).toBe(`${origin}/auth/sign-out-error`)
    expect(await response.text()).not.toContain('private provider detail')
  })

  it('offers the same retry when the service throws', async () => {
    createServerClient.mockRejectedValue(new Error('private provider detail'))
    const response = await POST(request())
    expect(response.headers.get('location')).toBe(`${origin}/auth/sign-out-error`)
  })
})
