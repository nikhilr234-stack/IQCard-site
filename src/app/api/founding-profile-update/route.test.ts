import { afterEach, describe, expect, it, vi } from 'vitest'
import * as route from './route'
const { GET } = route

afterEach(() => vi.unstubAllEnvs())

describe('founding profile update requests', () => {
  it('preserves submitted update details in an email draft without posting to another service', async () => {
    vi.stubEnv('IQCARD_ADMIN_EMAILS', 'support@example.com')
    const form = new FormData()
    form.set('profile', 'hema')
    form.set('name', 'Hema Goyal')
    form.set('field_to_update', 'Portfolio')
    form.set('new_link', 'https://studio.example.com/')
    form.set('notes', 'Please update my link.')
    const post = (route as Record<string, unknown>).POST
    expect(post, 'Update form handler is missing').toBeTypeOf('function')
    const response = await (post as (request: Request) => Promise<Response>)(new Request('https://iqcard.test/api/founding-profile-update', { method: 'POST', body: form }))
    expect(response.status).toBe(303)
    const target = new URL(response.headers.get('location')!)
    expect(target.searchParams.get('body')).toContain('Name: Hema Goyal')
    expect(target.searchParams.get('body')).toContain('New link: https://studio.example.com/')
    expect(target.searchParams.get('body')).toContain('Notes: Please update my link.')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('opens an email draft using the configured administrator without sending a message', async () => {
    vi.stubEnv('IQCARD_ADMIN_EMAILS', ' support@example.com,second@example.com ')
    const response = GET(new Request('https://iqcard.test/api/founding-profile-update?profile=aadhya'))
    expect(response.status).toBe(302)
    const target = new URL(response.headers.get('location')!)
    expect(target.protocol).toBe('mailto:')
    expect(target.pathname).toBe('support@example.com')
    expect(target.searchParams.get('subject')).toBe('Profile Update Request - aadhya')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it.each(['', 'not-a-founder', 'aadhya\r\nBcc:other@example.com'])('rejects an unknown or injected profile: %j', async (profile) => {
    vi.stubEnv('IQCARD_ADMIN_EMAILS', 'support@example.com')
    const response = GET(new Request(`https://iqcard.test/api/founding-profile-update?profile=${encodeURIComponent(profile)}`))
    expect(response.status).toBe(404)
    expect(response.headers.get('location')).toBeNull()
  })

  it.each(['', 'invalid-address', 'support@example.com\r\nBcc:other@example.com'])('handles missing or invalid support configuration without guessing: %j', async (email) => {
    vi.stubEnv('IQCARD_ADMIN_EMAILS', email)
    const response = GET(new Request('https://iqcard.test/api/founding-profile-update?profile=infant'))
    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})
