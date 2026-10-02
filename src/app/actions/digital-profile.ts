'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { normalizeLinks, validateLinks, type LinkInput } from '@/lib/profile/links'
import { normalizePresentation } from '@/lib/profile/presentation'
import { validateEditableProfile, type EditableProfileInput } from '@/lib/profile/validation'
import { createServerClient } from '@/lib/supabase/server'

function readJson(formData: FormData, field: string): unknown {
  const serialized = formData.get(field)
  if (typeof serialized !== 'string') throw new Error(`${field} could not be read.`)
  try {
    return JSON.parse(serialized) as unknown
  } catch {
    throw new Error(`${field} could not be read.`)
  }
}

function readProfile(formData: FormData) {
  const value = readJson(formData, 'profile')
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Profile details could not be read.')
  }
  const validation = validateEditableProfile(value as EditableProfileInput)
  if (!validation.ok) throw new Error(Object.values(validation.fieldErrors)[0] ?? 'Check the profile details and try again.')
  const tagline = (value as { tagline?: unknown }).tagline
  if (typeof tagline !== 'string' || tagline.length > 500) throw new Error('Check the profile details and try again.')
  return { ...validation.value, tagline: tagline.trim() }
}

function readLinks(formData: FormData): LinkInput[] {
  const value = readJson(formData, 'links')
  if (!Array.isArray(value)) throw new Error('Links could not be read.')
  const links = value.map((link) => {
    if (typeof link !== 'object' || link === null || Array.isArray(link)) throw new Error('Links could not be read.')
    const input = link as { label?: unknown; url?: unknown }
    if (typeof input.label !== 'string' || typeof input.url !== 'string') throw new Error('Links could not be read.')
    return { label: input.label, url: input.url }
  })
  const validationError = validateLinks(links)
  if (validationError) throw new Error(validationError)
  return normalizeLinks(links)
}

function readPresentation(formData: FormData) {
  const value = readJson(formData, 'presentation')
  const presentation = typeof value === 'object' && value !== null && !Array.isArray(value) && 'draft' in value
    ? value
    : { draft: value }
  return normalizePresentation(presentation).draft
}

export type SaveDigitalProfileResult =
  | { success: true; live: boolean }
  | { success: false; error: string }

export async function saveDigitalProfile(formData: FormData): Promise<SaveDigitalProfileResult> {
  const account = await requireAuthenticatedAccount()
  const profileDraft = readProfile(formData)
  const links = readLinks(formData)
  const draft = readPresentation(formData)
  const supabase = await createServerClient()
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id,slug')
    .eq('owner_id', account.id)
    .single()
  if (profileError || !profile) throw new Error('Unable to find your profile.')

  const { data: existing } = await supabase
    .from('profile_presentations')
    .select('draft')
    .eq('profile_id', profile.id)
    .maybeSingle()
  const storedCover = typeof existing?.draft === 'object' && existing.draft !== null
    ? (existing.draft as { cover?: Record<string, unknown> }).cover
    : null
  for (const [key, asset] of [['coverPath', 'cover'], ['photoPathOverride', 'portrait']] as const) {
    const expectedUrl = `/api/gift-media?slug=${encodeURIComponent(profile.slug)}&asset=${asset}`
    const previousPath = storedCover?.[key]
    if (draft.cover[key] === expectedUrl && typeof previousPath === 'string' && previousPath.startsWith(`gift/${profile.id}/`)) {
      draft.cover[key] = previousPath
    }
  }

  const { data: live, error } = await supabase.rpc('save_own_digital_profile', {
    p_profile: profileDraft,
    p_links: links,
    p_draft: draft,
  })
  if (error) throw new Error('Unable to save your profile. Please try again.')

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/digital-profile')
  revalidatePath(`/${profile.slug}`)
  return { success: true, live: live === true }
}
