import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { resolvePostLoginPath, safeReturnPath } from '@/lib/auth/roles'
import { parseEmailOtpType } from '@/lib/auth/otp'
import { callbackErrorReason } from '@/lib/auth/callback'
import { createServerClient } from '@/lib/supabase/server'
import { claimHandoffAfterAuth } from '@/lib/auth/handoff-claim'
import { claimRegistrationIntent, type RegistrationClaimStatus } from '@/lib/registration/claim'
import { randomUUID } from 'node:crypto'
import { logRegistrationEvent } from '@/lib/registration/observability'

function requestedNext(request: NextRequest): string | null {
  const directNext = request.nextUrl.searchParams.get('next')
  if (directNext) return safeReturnPath(directNext)

  const redirectTo = request.nextUrl.searchParams.get('redirect_to')
  if (!redirectTo) return null

  try {
    const redirectUrl = new URL(redirectTo, request.url)
    if (redirectUrl.origin !== request.nextUrl.origin) return null
    return safeReturnPath(redirectUrl.searchParams.get('next'))
  } catch {
    return null
  }
}

function requestedHandoff(request: NextRequest): string | null {
  const directHandoff = request.nextUrl.searchParams.get('handoff')
  if (directHandoff) return directHandoff

  const redirectTo = request.nextUrl.searchParams.get('redirect_to')
  if (!redirectTo) return null

  try {
    const redirectUrl = new URL(redirectTo, request.url)
    if (redirectUrl.origin !== request.nextUrl.origin) return null
    return redirectUrl.searchParams.get('handoff')
  } catch {
    return null
  }
}

function requestedRegistration(request: NextRequest): string | null {
  const directRegistration = request.nextUrl.searchParams.get('registration')
  if (directRegistration) return directRegistration

  const redirectTo = request.nextUrl.searchParams.get('redirect_to')
  if (!redirectTo) return null

  try {
    const redirectUrl = new URL(redirectTo, request.url)
    if (redirectUrl.origin !== request.nextUrl.origin) return null
    return redirectUrl.searchParams.get('registration')
  } catch {
    return null
  }
}

function registrationFailureReason(status: Exclude<RegistrationClaimStatus, 'claimed'>): string {
  const reasons = {
    expired: 'registration-expired',
    'already-used': 'registration-used',
    'email-mismatch': 'registration-email-mismatch',
    missing: 'registration-missing',
  }
  return reasons[status]
}

function registrationErrorUrl(request: NextRequest, reason: string, next: string | null): URL {
  const errorUrl = new URL('/auth/auth-code-error', request.url)
  errorUrl.searchParams.set('reason', reason)
  if (next) errorUrl.searchParams.set('next', next)
  return errorUrl
}

export async function GET(request: NextRequest) {
  const requestId = randomUUID()
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = parseEmailOtpType(request.nextUrl.searchParams.get('type'))
  const next = requestedNext(request)
  const handoff = requestedHandoff(request)
  const registration = requestedRegistration(request)
  if ((!tokenHash || !type) && !code) return NextResponse.redirect(new URL('/auth/auth-code-error?reason=invalid-link', request.url))

  const supabase = await createServerClient()
  const { error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : await supabase.auth.exchangeCodeForSession(code as string)
  if (error) {
    const errorUrl = new URL('/auth/auth-code-error', request.url)
    errorUrl.searchParams.set('reason', code ? callbackErrorReason(error) : 'invalid-link')
    if (next) errorUrl.searchParams.set('next', next)
    return NextResponse.redirect(errorUrl)
  }

  const account = await getCurrentAccount()
  if (!account) return NextResponse.redirect(new URL('/auth/auth-code-error?reason=invalid-link', request.url))

  if (registration) {
    try {
      const claim = await claimRegistrationIntent(registration, account)
      if (claim.status !== 'claimed') {
        logRegistrationEvent('registration_claim_failed', { requestId, outcome: 'failure', code: claim.status })
        return NextResponse.redirect(registrationErrorUrl(request, registrationFailureReason(claim.status), next))
      }
      logRegistrationEvent('registration_claimed', { requestId, outcome: 'success', code: 'claimed' })
    } catch {
      logRegistrationEvent('registration_claim_failed', { requestId, outcome: 'failure', code: 'unavailable' })
      return NextResponse.redirect(registrationErrorUrl(request, 'registration-unavailable', next))
    }
  } else {
    await claimHandoffAfterAuth(handoff, account.id)
  }
  return NextResponse.redirect(new URL(resolvePostLoginPath(account.role, next), request.url))
}
