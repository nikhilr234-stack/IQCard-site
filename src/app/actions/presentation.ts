'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { normalizePresentation } from '@/lib/profile/presentation'
import { createServerClient } from '@/lib/supabase/server'

function readPresentationDraft(formData: FormData) {
  const serialized = formData.get('presentation') ?? formData.get('draft')
  if (serialized === null) return normalizePresentation({}).draft
  if (typeof serialized !== 'string') throw new Error('Presentation settings could not be read.')

  let value: unknown
  try {
    value = JSON.parse(serialized)
  } catch {
    throw new Error('Presentation settings could not be read.')
  }

  const presentation = typeof value === 'object' && value !== null && !Array.isArray(value) && 'draft' in value
    ? value
    : { draft: value }
  return normalizePresentation(presentation).draft
}

export async function savePresentationDraft(formData: FormData) {
  await requireAuthenticatedAccount()
  const draft = readPresentationDraft(formData)
  const supabase = await createServerClient()
  const { error } = await supabase.rpc('save_own_profile_presentation', { p_draft: draft })
  if (error) throw new Error('Unable to save presentation.')

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/digital-profile')
}

export async function publishPresentation() {
  const account = await requireAuthenticatedAccount()
  const supabase = await createServerClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('slug')
    .eq('owner_id', account.id)
    .single()
  if (profileError || !profile?.slug) throw new Error('Create your profile before publishing.')

  const { error: promotionError } = await supabase.rpc('publish_own_profile_presentation')
  if (promotionError) throw new Error('Unable to publish presentation.')

  const { error: publicationError } = await supabase.rpc('complete_own_onboarding_publish', { p_publish: true })
  if (publicationError) throw new Error('Unable to publish profile.')

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/digital-profile')
  revalidatePath(`/${profile.slug}`)
}
