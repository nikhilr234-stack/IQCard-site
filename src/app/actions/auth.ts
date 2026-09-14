'use server'

import { redirect } from 'next/navigation'
import { getPublicEnv } from '@/lib/env'
import { magicLinkErrorReason } from '@/lib/auth/messages'
import { safeReturnPath } from '@/lib/auth/roles'
import { createServerClient } from '@/lib/supabase/server'

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const next = safeReturnPath(String(formData.get('next') ?? ''))

  if (!email) redirect('/login?error=email-required')

  const environment = getPublicEnv()
  const supabase = await createServerClient()
  const callbackUrl = new URL('/auth/confirm', environment.siteUrl)
  if (next) callbackUrl.searchParams.set('next', next)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callbackUrl.toString() },
  })

  if (error) redirect(`/login?error=${magicLinkErrorReason(error)}`)
  redirect('/login?sent=1')
}
