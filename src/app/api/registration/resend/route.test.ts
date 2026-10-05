import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './route'

const mocks = vi.hoisted(() => ({
  isEnabled: vi.fn(() => true),
  rateLimit: vi.fn(),
  resend: vi.fn(),
  supabase: { auth: { signInWithOtp: vi.fn() } },
}))

vi.mock('@/lib/features', () => ({ isOnboardingV2Enabled: mocks.isEnabled }))
vi.mock('@/lib/registration/rate-limit', () => ({ checkRegistrationRateLimit: mocks.rateLimit }))
vi.mock('@/lib/registration/resend', () => ({ resendRegistrationIntent: mocks.resend }))
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({ siteUrl: 'https://iqcard.in' }) }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => mocks.supabase }))

describe('registration resend route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isEnabled.mockReturnValue(true)
    mocks.rateLimit.mockResolvedValue({ allowed: true })
    mocks.resend.mockResolvedValue({ token: 'fresh-secret', email: 'owner@example.com', designId: 'IQD-ABC123' })
    mocks.supabase.auth.signInWithOtp.mockResolvedValue({ error: null })
  })

  it('sends a new link for the saved card without exposing registration existence', async () => {
    const response = await POST(new Request('https://iqcard.in/api/registration/resend', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', designId: 'IQD-ABC123' }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mocks.supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: { emailRedirectTo: 'https://iqcard.in/auth/confirm?registration=fresh-secret&next=%2Fonboarding%2Fidentity' },
    })
  })

  it('returns the same generic success if the pending registration is unavailable', async () => {
    mocks.resend.mockResolvedValue(null)
    const response = await POST(new Request('https://iqcard.in/api/registration/resend', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', designId: 'IQD-ABC123' }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mocks.supabase.auth.signInWithOtp).not.toHaveBeenCalled()
  })
})
