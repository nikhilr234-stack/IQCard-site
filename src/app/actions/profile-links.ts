'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { normalizeLinks, validateLinks, type LinkInput } from '@/lib/profile/links'
import { createServerClient } from '@/lib/supabase/server'

function parseLinks(formData: FormData): LinkInput[] {
  const raw = String(formData.get('links') ?? '[]')
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((link) => ({ label: String(link?.label ?? ''), url: String(link?.url ?? '') })) : []
  } catch {
    throw new Error('Links could not be read.')
  }
}

export async function saveProfileLinks(formData: FormData) {
  const account = await requireAuthenticatedAccount()
  const links = parseLinks(formData)
  const validationError = validateLinks(links)
  if (validationError) throw new Error(validationError)
  const normalized = normalizeLinks(links)
  const supabase = await createServerClient()
  const { data: profile, error: profileError } = await supabase.from('profiles').select('slug').eq('owner_id', account.id).single()
  if (profileError || !profile) throw new Error('Unable to find your profile.')
  const { error } = await supabase.rpc('replace_own_profile_links', { p_links: normalized })
  if (error) throw new Error('Unable to update profile links.')
  revalidatePath('/dashboard')
  if (profile.slug) revalidatePath(`/${profile.slug}`)
}
