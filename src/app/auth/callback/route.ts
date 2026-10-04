import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { resolvePostLoginPath, safeReturnPath } from '@/lib/auth/roles'
import { createServerClient } from '@/lib/supabase/server'
import { callbackErrorReason } from '@/lib/auth/callback'
import { claimRegistrationIntent } from '@/lib/registration/claim'
import { claimHandoffAfterAuth } from '@/lib/auth/handoff-claim'

function requestedParameter(request: NextRequest, name: string): string | null {
  const direct = request.nextUrl.searchParams.get(name)
  if (direct) return direct
  const redirectTo = request.nextUrl.searchParams.get('redirect_to')
  if (!redirectTo) return null
  try {
    const url = new URL(redirectTo, request.url)
    return url.origin === request.nextUrl.origin ? url.searchParams.get(name) : null
  } catch { return null }
}

async function attachRegistration(registration: string | null, account: { id: string; email: string }): Promise<string | null> {
  if (!registration) return null
  try {
    const claim = await claimRegistrationIntent(registration, account)
    if (claim.status === 'claimed') return null
    return { expired: 'registration-expired', 'already-used': 'registration-used', 'email-mismatch': 'registration-email-mismatch', missing: 'registration-missing' }[claim.status]
  } catch { return 'registration-unavailable' }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = safeReturnPath(requestedParameter(request, 'next'))
  const handoff = requestedParameter(request, 'handoff')
  const registration = requestedParameter(request, 'registration')

  if (!code) return NextResponse.redirect(new URL('/auth/auth-code-error', request.url), 303)

  const supabase = await createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback] code exchange failed', {
      name: error.name,
      code: error.code,
      status: error.status,
      message: error.message,
    })
    const errorUrl = new URL('/auth/auth-code-error', request.url)
    errorUrl.searchParams.set('reason', callbackErrorReason(error))
    if (next) errorUrl.searchParams.set('next', next)
    return NextResponse.redirect(errorUrl, 303)
  }

  const account = await getCurrentAccount()
  if (!account) {
    console.error('[auth/callback] session exchanged but account was not found')
    const errorUrl = new URL('/auth/auth-code-error', request.url)
    errorUrl.searchParams.set('reason', 'invalid-link')
    return NextResponse.redirect(errorUrl, 303)
  }

  const registrationError = await attachRegistration(registration, account)
  if (registrationError) {
    const errorUrl = new URL('/auth/auth-code-error', request.url)
    errorUrl.searchParams.set('reason', registrationError)
    if (next) errorUrl.searchParams.set('next', next)
    return NextResponse.redirect(errorUrl, 303)
  }
  if (!registration) await claimHandoffAfterAuth(handoff, account.id)
  return NextResponse.redirect(new URL(resolvePostLoginPath(account.role, next), request.url), 303)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const code = String(formData.get('code') ?? '')
  const next = safeReturnPath(String(formData.get('next') ?? '') || null)
  const handoff = String(formData.get('handoff') ?? '') || null
  const registration = String(formData.get('registration') ?? '') || null

  if (!code) return NextResponse.redirect(new URL('/auth/auth-code-error', request.url), 303)

  const supabase = await createServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[auth/callback] code exchange failed', {
      name: error.name,
      code: error.code,
      status: error.status,
      message: error.message,
    })
    const errorUrl = new URL('/auth/auth-code-error', request.url)
    errorUrl.searchParams.set('reason', callbackErrorReason(error))
    if (next) errorUrl.searchParams.set('next', next)
    return NextResponse.redirect(errorUrl, 303)
  }

  const account = await getCurrentAccount()
  if (!account) {
    console.error('[auth/callback] session exchanged but account was not found')
    const errorUrl = new URL('/auth/auth-code-error', request.url)
    errorUrl.searchParams.set('reason', 'invalid-link')
    return NextResponse.redirect(errorUrl, 303)
  }

  const registrationError = await attachRegistration(registration, account)
  if (registrationError) {
    const errorUrl = new URL('/auth/auth-code-error', request.url)
    errorUrl.searchParams.set('reason', registrationError)
    if (next) errorUrl.searchParams.set('next', next)
    return NextResponse.redirect(errorUrl, 303)
  }
  if (!registration) await claimHandoffAfterAuth(handoff, account.id)
  return NextResponse.redirect(new URL(resolvePostLoginPath(account.role, next), request.url), 303)
}
