import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const auth = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  getCurrentAccount: vi.fn(),
  claimHandoffAfterAuth: vi.fn(),
  claimRegistrationIntent: vi.fn(),
  logRegistrationEvent: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: {
      exchangeCodeForSession: auth.exchangeCodeForSession,
      verifyOtp: auth.verifyOtp,
    },
  })),
}))
vi.mock('@/lib/auth/account', () => ({ getCurrentAccount: auth.getCurrentAccount }))
vi.mock('@/lib/auth/handoff-claim', () => ({ claimHandoffAfterAuth: auth.claimHandoffAfterAuth }))
vi.mock('@/lib/registration/claim', () => ({ claimRegistrationIntent: auth.claimRegistrationIntent }))
vi.mock('@/lib/registration/observability', () => ({ logRegistrationEvent: auth.logRegistrationEvent }))

import { GET } from './route'

describe('email confirmation route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    auth.verifyOtp.mockResolvedValue({ error: null })
    auth.getCurrentAccount.mockResolvedValue({ id: 'account-123', email: 'owner@example.com', role: 'client' })
    auth.claimHandoffAfterAuth.mockResolvedValue(null)
    auth.claimRegistrationIntent.mockResolvedValue({ status: 'claimed', intentId: 'intent-1' })
  })

  it('exchanges the code returned by the default Supabase email confirmation link', async () => {
    const request = new NextRequest('https://iqcard.in/auth/confirm?code=confirmation-code&handoff=handoff-123&next=%2Fdashboard%3Fsetup%3D1')

    const response = await GET(request)

    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith('confirmation-code')
    expect(auth.verifyOtp).not.toHaveBeenCalled()
    expect(auth.claimHandoffAfterAuth).toHaveBeenCalledWith('handoff-123', 'account-123')
    expect(response.headers.get('location')).toBe('https://iqcard.in/dashboard?setup=1')
  })

  it('keeps supporting direct token-hash links for cross-browser confirmation', async () => {
    const request = new NextRequest('https://iqcard.in/auth/confirm?token_hash=hash-123&type=email&next=%2Fdashboard')

    await GET(request)

    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 'hash-123', type: 'email' })
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('claims a v2 registration against the verified account email and skips the legacy claim', async () => {
    const request = new NextRequest('https://iqcard.in/auth/confirm?code=confirmation-code&registration=raw-secret&next=%2Fonboarding%2Fidentity')

    const response = await GET(request)

    expect(auth.claimRegistrationIntent).toHaveBeenCalledWith('raw-secret', {
      id: 'account-123',
      email: 'owner@example.com',
      role: 'client',
    })
    expect(auth.claimHandoffAfterAuth).not.toHaveBeenCalled()
    expect(response.headers.get('location')).toBe('https://iqcard.in/onboarding/identity')
  })

  it.each([
    ['expired', 'registration-expired'],
    ['already-used', 'registration-used'],
    ['email-mismatch', 'registration-email-mismatch'],
    ['missing', 'registration-missing'],
  ])('maps a %s registration result to a recoverable reason', async (status, reason) => {
    auth.claimRegistrationIntent.mockResolvedValue({ status, intentId: null })
    const request = new NextRequest('https://iqcard.in/auth/confirm?code=confirmation-code&registration=raw-secret&next=%2Fonboarding%2Fidentity')

    const response = await GET(request)

    expect(response.headers.get('location')).toBe(`https://iqcard.in/auth/auth-code-error?reason=${reason}&next=%2Fonboarding%2Fidentity`)
  })

  it('drops an obfuscated external return path from both successful and failed confirmations', async () => {
    const unsafeNext = encodeURIComponent('/%2f%2fevil.example')
    const success = await GET(new NextRequest(`https://iqcard.in/auth/confirm?code=confirmation-code&next=${unsafeNext}`))

    expect(success.headers.get('location')).toBe('https://iqcard.in/dashboard')

    auth.exchangeCodeForSession.mockResolvedValueOnce({ error: { code: 'otp_expired' } })
    const failure = await GET(new NextRequest(`https://iqcard.in/auth/confirm?code=confirmation-code&next=${unsafeNext}`))

    expect(failure.headers.get('location')).toBe('https://iqcard.in/auth/auth-code-error?reason=invalid-link')
  })
})
