import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { resolvePostLoginPath, safeReturnPath } from '@/lib/auth/roles'
import { createServerClient } from '@/lib/supabase/server'
import { callbackErrorReason } from '@/lib/auth/callback'
import { claimHandoffAfterAuth } from '@/lib/auth/handoff-claim'

function requestedHandoff(request: NextRequest): string | null {
  return request.nextUrl.searchParams.get('handoff')
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const next = safeReturnPath(request.nextUrl.searchParams.get('next'))
  const handoff = requestedHandoff(request)

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

  await claimHandoffAfterAuth(handoff, account.id)
  return NextResponse.redirect(new URL(resolvePostLoginPath(account.role, next), request.url), 303)
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const code = String(formData.get('code') ?? '')
  const next = safeReturnPath(String(formData.get('next') ?? '') || null)
  const handoff = String(formData.get('handoff') ?? '') || null

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

  await claimHandoffAfterAuth(handoff, account.id)
  return NextResponse.redirect(new URL(resolvePostLoginPath(account.role, next), request.url), 303)
}
