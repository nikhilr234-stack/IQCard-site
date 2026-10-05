import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createCheckoutHandoff: vi.fn(),
  createRegistrationIntent: vi.fn(),
  signInWithOtp: vi.fn(),
  checkRegistrationRateLimit: vi.fn(),
  logRegistrationEvent: vi.fn(),
  onboardingV2: true,
}))

vi.mock('@/lib/checkout/repository', () => ({ createCheckoutHandoff: mocks.createCheckoutHandoff }))
vi.mock('@/lib/registration/repository', () => ({ createRegistrationIntent: mocks.createRegistrationIntent }))
vi.mock('@/lib/features', () => ({ isOnboardingV2Enabled: () => mocks.onboardingV2 }))
vi.mock('@/lib/registration/rate-limit', () => ({ checkRegistrationRateLimit: mocks.checkRegistrationRateLimit }))
vi.mock('@/lib/registration/observability', () => ({ logRegistrationEvent: mocks.logRegistrationEvent }))
vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({
    siteUrl: 'https://iqcard.in',
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon',
  }),
}))
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({ auth: { signInWithOtp: mocks.signInWithOtp } })),
}))

import { POST } from './route'

const validBody = {
  email: ' Owner@Example.com ',
  designId: 'IQD-ABC123',
  payload: {
    schemaVersion: '1.0',
    configuration: {
      core: 'black',
      material: 'Walnut',
      customColor: null,
      identity: {
        name: 'Nikhil Rakesh',
        tone: 'dark',
        composition: 'signature',
        fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
      },
      logo: { mode: 'iq', dataUrl: null, filename: null, mimeType: null, scale: 1, x: 0, y: 0, align: 'right' },
      backLayout: 'pure',
      craft: 'engrave',
    },
    pricing: { total: 1 },
    manufacturing: { surfaces: { front: { material: 'Forged' } } },
  },
}

const canonicalPayload = {
  schemaVersion: '1.0',
  configuration: validBody.payload.configuration,
  pricing: {
    currency: 'INR',
    pricingVersion: 'flat-inr-v2',
    provisional: true,
    components: { base: 799, material: 0, craft: 0, customLogoSetup: 0 },
    total: 799,
  },
  manufacturing: {
    core: { color: 'black' },
    surfaces: {
      front: { material: 'Walnut', customColor: null },
      back: { material: 'Walnut', customColor: null },
    },
    identity: {
      name: 'Nikhil Rakesh',
      fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
      logoMode: 'iq',
      logoPlacement: { scale: 1, x: 0, y: 0, align: 'right' },
      craft: 'engrave',
    },
    back: { layout: 'pure', backLayout: 'pure', tapToConnect: true },
  },
}

describe('checkout registration handoff route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.onboardingV2 = true
    mocks.createRegistrationIntent.mockResolvedValue({ token: 'registration-secret', intentId: 'intent-1' })
    mocks.createCheckoutHandoff.mockResolvedValue({ token: 'legacy-secret' })
    mocks.signInWithOtp.mockResolvedValue({ error: null })
    mocks.checkRegistrationRateLimit.mockResolvedValue({ allowed: true })
  })

  it('canonicalizes a modified browser payload before persistence and places the raw token only in the callback', async () => {
    const response = await POST(new Request('https://iqcard.in/api/checkout/handoff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    }))

    expect(mocks.createRegistrationIntent).toHaveBeenCalledWith({
      email: 'owner@example.com',
      designId: 'IQD-ABC123',
      payload: canonicalPayload,
      firstName: 'Nikhil',
      lastName: 'Rakesh',
    })
    expect(mocks.createCheckoutHandoff).not.toHaveBeenCalled()
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: {
        emailRedirectTo: 'https://iqcard.in/auth/confirm?registration=registration-secret&next=%2Fonboarding%2Fidentity',
      },
    })
    expect(await response.json()).toEqual({ ok: true, sent: true, next: '/register/check-email' })
  })

  it('accepts an optional card identity when sending the handoff email', async () => {
    const response = await POST(new Request('https://iqcard.in/api/checkout/handoff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...validBody,
        payload: {
          ...validBody.payload,
          configuration: {
            ...validBody.payload.configuration,
            identity: { ...validBody.payload.configuration.identity, name: 'YOUR NAME' },
          },
        },
      }),
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ ok: true, sent: true })
    expect(mocks.createRegistrationIntent).toHaveBeenCalled()
    expect(mocks.signInWithOtp).toHaveBeenCalled()
  })

  it('keeps the legacy handoff available while the v2 flag is disabled', async () => {
    mocks.onboardingV2 = false

    await POST(new Request('https://iqcard.in/api/checkout/handoff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    }))

    expect(mocks.createCheckoutHandoff).toHaveBeenCalledWith({
      email: 'owner@example.com',
      designId: 'IQD-ABC123',
      payload: canonicalPayload,
    })
    expect(mocks.createRegistrationIntent).not.toHaveBeenCalled()
    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: 'owner@example.com',
      options: {
        emailRedirectTo: 'https://iqcard.in/auth/confirm?handoff=legacy-secret&next=%2Fdashboard',
      },
    })
  })

  it('returns a retryable response without exposing provider details', async () => {
    mocks.signInWithOtp.mockResolvedValue({ error: { code: 'rate_limit', status: 429, message: 'provider secret' } })

    const response = await POST(new Request('https://iqcard.in/api/checkout/handoff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validBody),
    }))

    expect(response.status).toBe(502)
    expect(JSON.stringify(await response.json())).not.toContain('provider secret')
  })

  it('stops before persistence and email when the durable limit is exhausted', async () => {
    mocks.checkRegistrationRateLimit.mockResolvedValue({ allowed: false, retryAfterSeconds: 600 })
    const response = await POST(new Request('https://iqcard.in/api/checkout/handoff', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(validBody),
    }))
    expect(response.status).toBe(429)
    expect(response.headers.get('retry-after')).toBe('600')
    expect(mocks.createRegistrationIntent).not.toHaveBeenCalled()
    expect(mocks.signInWithOtp).not.toHaveBeenCalled()
  })
})
