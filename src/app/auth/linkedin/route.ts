import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getPublicEnv } from '@/lib/env'
import { isLinkedInImportConfigured, LINKEDIN_AUTHORIZE_URL } from '@/lib/linkedin'

export async function GET() {
  await requireAuthenticatedAccount()
  if (!isLinkedInImportConfigured()) return NextResponse.redirect(new URL('/dashboard?linkedin=unavailable', getPublicEnv().siteUrl))
  const state = randomBytes(24).toString('hex')
  const env = getPublicEnv()
  const params = new URLSearchParams({ response_type: 'code', client_id: process.env.LINKEDIN_CLIENT_ID!.trim(), redirect_uri: `${env.siteUrl}/auth/linkedin/callback`, state, scope: 'openid profile email' })
  const response = NextResponse.redirect(`${LINKEDIN_AUTHORIZE_URL}?${params.toString()}`)
  response.cookies.set('linkedin_oauth_state', state, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' })
  return response
}
