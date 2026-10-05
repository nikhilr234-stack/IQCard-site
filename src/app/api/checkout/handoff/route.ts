import { NextResponse } from 'next/server'
import { createCheckoutHandoff } from '@/lib/checkout/repository'
import { getPublicEnv } from '@/lib/env'
import { isOnboardingV2Enabled } from '@/lib/features'
import { createRegistrationIntent } from '@/lib/registration/repository'
import { validateRegistrationRequest } from '@/lib/registration/validation'
import { createServerClient } from '@/lib/supabase/server'
import { randomUUID } from 'node:crypto'
import { checkRegistrationRateLimit } from '@/lib/registration/rate-limit'
import { logRegistrationEvent } from '@/lib/registration/observability'

export async function POST(request: Request) {
  const requestId = randomUUID()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({
      ok: false,
      field: 'payload',
      code: 'invalid-payload',
      error: 'We could not read this card design. Please review it and try again.',
    }, { status: 400 })
  }

  const validation = validateRegistrationRequest(body)
  if (!validation.ok) {
    return NextResponse.json({
      ok: false,
      field: validation.field,
      code: validation.code,
      error: validation.message,
    }, { status: 400 })
  }

  const registrationV2 = isOnboardingV2Enabled()
  const input = validation.value
  if (registrationV2) {
    try {
      const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
      const rateLimit = await checkRegistrationRateLimit({ email: input.email, ip: forwardedFor })
      if (!rateLimit.allowed) {
        logRegistrationEvent('registration_rate_limited', { requestId, outcome: 'limited', code: 'durable-limit' })
        return NextResponse.json(
          { ok: false, error: 'Too many requests right now. Please wait a little and try again.' },
          { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) } },
        )
      }
    } catch {
      logRegistrationEvent('registration_email_failed', { requestId, outcome: 'failure', code: 'rate-limit-unavailable' })
      return NextResponse.json({ ok: false, error: 'We could not start registration. Please try again.' }, { status: 503 })
    }
  }
  let token: string
  try {
    if (registrationV2) {
      ({ token } = await createRegistrationIntent(input))
      logRegistrationEvent('registration_intent_created', { requestId, outcome: 'success', code: 'created' })
    } else {
      ({ token } = await createCheckoutHandoff({
        email: input.email,
        designId: input.designId,
        payload: input.payload,
      }))
    }
  } catch (error) {
    console.error('[checkout/handoff] design save failed', error)
    return NextResponse.json({ ok: false, error: 'We could not save your design. Please try again.' }, { status: 500 })
  }

  const environment = getPublicEnv()
  const callbackUrl = new URL('/auth/confirm', environment.siteUrl)
  callbackUrl.searchParams.set(registrationV2 ? 'registration' : 'handoff', token)
  callbackUrl.searchParams.set('next', registrationV2 ? '/onboarding/identity' : '/dashboard')

  const supabase = await createServerClient()
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email,
    options: { emailRedirectTo: callbackUrl.toString() },
  })

  if (error) {
    console.error('[checkout/handoff] magic-link request failed', {
      code: error.code,
      status: error.status,
    })
    if (registrationV2) logRegistrationEvent('registration_email_failed', { requestId, outcome: 'failure', code: error.code })
    return NextResponse.json({ ok: false, error: 'We could not send the sign-in link. Please try again.' }, { status: 502 })
  }

  if (registrationV2) logRegistrationEvent('registration_email_sent', { requestId, outcome: 'success', code: 'accepted' })

  return NextResponse.json({
    ok: true,
    sent: true,
    ...(registrationV2 ? { next: '/register/check-email' } : {}),
  })
}
