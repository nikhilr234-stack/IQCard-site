import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const dependencies = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getCurrentAccount: vi.fn(),
  claimHandoffAfterAuth: vi.fn(),
  claimRegistrationIntent: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: dependencies.exchangeCodeForSession },
  })),
}))
vi.mock('@/lib/auth/account', () => ({ getCurrentAccount: dependencies.getCurrentAccount }))
vi.mock('@/lib/auth/handoff-claim', () => ({ claimHandoffAfterAuth: dependencies.claimHandoffAfterAuth }))

vi.mock('@/lib/registration/claim', () => ({ claimRegistrationIntent: dependencies.claimRegistrationIntent }))

import { GET, POST } from './route'

describe('auth code callback return paths', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    dependencies.exchangeCodeForSession.mockResolvedValue({ error: null })
    dependencies.getCurrentAccount.mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', role: 'client' })
    dependencies.claimHandoffAfterAuth.mockResolvedValue(null)
    dependencies.claimRegistrationIntent.mockResolvedValue({ status: 'claimed', intentId: 'intent-1' })
  })

  afterEach(() => vi.restoreAllMocks())

  it('drops an unsafe GET return path after a successful code exchange', async () => {
    const response = await GET(new NextRequest('https://iqcard.in/auth/callback?code=code-1&next=%2F%252f%252fevil.example'))

    expect(response.headers.get('location')).toBe('https://iqcard.in/dashboard')
  })

  it('drops an unsafe POST return path from a failed code-exchange redirect', async () => {
    dependencies.exchangeCodeForSession.mockResolvedValueOnce({ error: { code: 'otp_expired', message: 'expired' } })
    const form = new FormData()
    form.set('code', 'code-1')
    form.set('next', '//evil.example')
    const request = new NextRequest('https://iqcard.in/auth/callback', { method: 'POST', body: form })

    const response = await POST(request)

    expect(response.headers.get('location')).toBe('https://iqcard.in/auth/auth-code-error?reason=invalid-link')
  })
  it.each(['GET', 'POST'])('attaches registration on %s before entering the dashboard', async method => {
    dependencies.claimRegistrationIntent.mockResolvedValueOnce({ status: 'email-mismatch', intentId: null })
    const form = new FormData()
    form.set('code', 'code-1')
    form.set('registration', 'registration-token')
    const response = method === 'GET'
      ? await GET(new NextRequest('https://iqcard.in/auth/callback?code=code-1&registration=registration-token'))
      : await POST(new NextRequest('https://iqcard.in/auth/callback', { method: 'POST', body: form }))
    expect(response.headers.get('location')).toBe('https://iqcard.in/auth/auth-code-error?reason=registration-email-mismatch')
  })

  it('recovers registration from a same-origin redirect_to', async () => {
    dependencies.claimRegistrationIntent.mockResolvedValueOnce({ status: 'expired', intentId: null })
    const redirect = encodeURIComponent('https://iqcard.in/auth/confirm?registration=registration-token')
    const response = await GET(new NextRequest(`https://iqcard.in/auth/callback?code=code-1&redirect_to=${redirect}`))
    expect(response.headers.get('location')).toBe('https://iqcard.in/auth/auth-code-error?reason=registration-expired')
  })

})
