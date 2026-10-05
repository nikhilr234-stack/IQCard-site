import { NextResponse } from 'next/server'
import { getPublicEnv } from '@/lib/env'
import { isOnboardingV2Enabled } from '@/lib/features'
import { checkRegistrationRateLimit } from '@/lib/registration/rate-limit'
import { resendRegistrationIntent } from '@/lib/registration/resend'
import { normalizeHandoffEmail } from '@/lib/checkout/handoff'
import { createServerClient } from '@/lib/supabase/server'

const DESIGN_ID_PATTERN = /^IQD-[A-Z0-9-]{4,80}$/i

export async function POST(request: Request) {
  if (!isOnboardingV2Enabled()) return NextResponse.json({ ok: false, error: 'Registration is unavailable.' }, { status: 404 })

  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'Enter your email and try again.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ ok: false, error: 'Enter your email and try again.' }, { status: 400 })
  const candidate = body as { email?: unknown; designId?: unknown }
  const email = typeof candidate.email === 'string' ? normalizeHandoffEmail(candidate.email) : null
  const designId = typeof candidate.designId === 'string' ? candidate.designId.trim() : ''
  if (!email || !DESIGN_ID_PATTERN.test(designId)) return NextResponse.json({ ok: false, error: 'Return to your saved card and try again.' }, { status: 400 })

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? ''
    const limit = await checkRegistrationRateLimit({ email, ip })
    if (!limit.allowed) return NextResponse.json({ ok: false, error: 'Please wait a few minutes before requesting another link.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })

    const intent = await resendRegistrationIntent({ email, designId })
    if (intent) {
      const callbackUrl = new URL('/auth/confirm', getPublicEnv().siteUrl)
      callbackUrl.searchParams.set('registration', intent.token)
      callbackUrl.searchParams.set('next', '/onboarding/identity')
      const { error } = await (await createServerClient()).auth.signInWithOtp({ email: intent.email, options: { emailRedirectTo: callbackUrl.toString() } })
      if (error) return NextResponse.json({ ok: false, error: 'We could not send the link. Please try again shortly.' }, { status: 502 })
    }
    // Keep the response the same when the saved intent is missing to avoid revealing account state.
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false, error: 'We could not send the link. Please try again shortly.' }, { status: 503 })
  }
}
