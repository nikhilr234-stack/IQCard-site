import { NextResponse } from 'next/server'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getPublicEnv } from '@/lib/env'
import { fetchLinkedInJson, isLinkedInImportConfigured, LINKEDIN_REQUEST_TIMEOUT_MS, LINKEDIN_TOKEN_URL, LINKEDIN_USERINFO_URL, LinkedInTemporaryFailure, mapLinkedInProfile, type LinkedInProfile } from '@/lib/linkedin'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const env = getPublicEnv()
  const url = new URL(request.url)
  const redirectToDashboard = (reason: string) => NextResponse.redirect(new URL(`/dashboard?linkedin=${encodeURIComponent(reason)}`, env.siteUrl))
  if (!isLinkedInImportConfigured()) return redirectToDashboard('unavailable')
  const account = await requireAuthenticatedAccount()
  const stateCookie = (await import('next/headers')).cookies
  const cookiesStore = await stateCookie()
  const expectedState = cookiesStore.get('linkedin_oauth_state')?.value
  if (!expectedState || !url.searchParams.get('state') || expectedState !== url.searchParams.get('state')) return redirectToDashboard('invalid_state')
  cookiesStore.delete('linkedin_oauth_state')
  const code = url.searchParams.get('code')
  if (!code) return redirectToDashboard('cancelled')
  let tokenResult: Awaited<ReturnType<typeof fetchLinkedInJson<{ access_token?: unknown }>>>
  try {
    tokenResult = await fetchLinkedInJson<{ access_token?: unknown }>(LINKEDIN_TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, client_id: process.env.LINKEDIN_CLIENT_ID!.trim(), client_secret: process.env.LINKEDIN_CLIENT_SECRET!.trim(), redirect_uri: `${env.siteUrl}/auth/linkedin/callback` }) }, LINKEDIN_REQUEST_TIMEOUT_MS)
  } catch (error) {
    if (error instanceof LinkedInTemporaryFailure) return redirectToDashboard(error.code)
    throw error
  }
  if (!tokenResult.response.ok || !tokenResult.data || typeof tokenResult.data.access_token !== 'string' || !tokenResult.data.access_token) return redirectToDashboard('token_error')

  let profileResult: Awaited<ReturnType<typeof fetchLinkedInJson<LinkedInProfile>>>
  try {
    profileResult = await fetchLinkedInJson<LinkedInProfile>(LINKEDIN_USERINFO_URL, { headers: { Authorization: `Bearer ${tokenResult.data.access_token}` } }, LINKEDIN_REQUEST_TIMEOUT_MS)
  } catch (error) {
    if (error instanceof LinkedInTemporaryFailure) return redirectToDashboard(error.code)
    throw error
  }
  if (!profileResult.response.ok || !profileResult.data || typeof profileResult.data !== 'object') return redirectToDashboard('profile_error')
  const profile = mapLinkedInProfile(profileResult.data)
  const supabase = await createServerClient()
  const { data: current, error: profileQueryError } = await supabase.from('profiles').select('id,status').eq('owner_id', account.id).single()
  if (profileQueryError) return redirectToDashboard('save_error')
  if (!current || current.status !== 'draft') return redirectToDashboard('unpublish_first')
  const updates: Record<string, string> = {}
  if (profile.full_name) updates.full_name = profile.full_name
  if (profile.email) updates.email = profile.email
  if (Object.keys(updates).length) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', current.id)
    if (error) return redirectToDashboard('save_error')
  }
  return redirectToDashboard('imported')
}
