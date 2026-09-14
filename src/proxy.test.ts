import type { User } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession: vi.fn(),
}))

import { updateSession } from '@/lib/supabase/proxy'
import { config, proxy } from './proxy'

const verifiedUser = {
  id: 'user-123',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'client@example.com',
  email_confirmed_at: '2026-09-06T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-09-06T00:00:00.000Z',
  last_sign_in_at: '2026-09-06T00:00:00.000Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2026-09-06T00:00:00.000Z',
  updated_at: '2026-09-06T00:00:00.000Z',
  is_anonymous: false,
} satisfies User

describe('protected proxy routes', () => {
  beforeEach(() => {
    vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: null })
  })

  it('includes every protected nested route in the static proxy matcher', () => {
    expect(config.matcher).toContain('/onboarding/:path*')
    expect(config.matcher).toContain('/dashboard/:path*')
  })

  it('sends a signed-out onboarding request to login with its return path', async () => {
    const response = await proxy(new NextRequest('https://iqcard.in/onboarding/content?resume=1'))
    expect(response.headers.get('location')).toBe('https://iqcard.in/login?next=%2Fonboarding%2Fcontent%3Fresume%3D1')
  })

  it('sends a signed-out nested dashboard request to login with its return path', async () => {
    const response = await proxy(new NextRequest('https://iqcard.in/dashboard/preview?mode=shared'))

    expect(response.headers.get('location')).toBe('https://iqcard.in/login?next=%2Fdashboard%2Fpreview%3Fmode%3Dshared')
  })

  it('does not trust a synthetic auth-token cookie', async () => {
    const request = new NextRequest('https://iqcard.in/onboarding/contact', {
      headers: { cookie: 'sb-project-auth-token=session' },
    })
    const response = await proxy(request)

    expect(response.headers.get('location')).toContain('/login?next=')
  })

  it('continues only when session refresh verifies a user', async () => {
    vi.mocked(updateSession).mockResolvedValue({ response: NextResponse.next(), user: verifiedUser })

    const response = await proxy(new NextRequest('https://iqcard.in/onboarding/contact'))

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})
