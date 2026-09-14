'use server'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { validateEditableProfile } from '@/lib/profile/validation'
import { normalizeLinks, validateLinks, type LinkInput } from '@/lib/profile/links'
import { createServerClient } from '@/lib/supabase/server'

export async function saveProfileDraft(formData: FormData) {
  const account = await requireAuthenticatedAccount()
  const visible = (name: string) => {
    const value = formData.get(name)
    return value === 'on' || value === 'true' || value === '1'
  }
  const validation = validateEditableProfile({
    slug: String(formData.get('slug') ?? ''),
    full_name: String(formData.get('full_name') ?? ''),
    headline: String(formData.get('headline') ?? ''),
    bio: String(formData.get('bio') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    whatsapp: String(formData.get('whatsapp') ?? ''),
    location: String(formData.get('location') ?? ''),
    public_email_visible: visible('public_email_visible'),
    phone_visible: visible('phone_visible'),
    whatsapp_visible: visible('whatsapp_visible'),
    location_visible: visible('location_visible'),
  })
  if (!validation.ok) throw new Error(Object.values(validation.fieldErrors)[0] ?? 'Unable to validate profile.')
  const input = validation.value
  const linksValue = formData.get('links')
  let normalizedLinks: LinkInput[] | null = null
  if (typeof linksValue === 'string') {
    let links: LinkInput[]
    try {
      const parsed = JSON.parse(linksValue)
      links = Array.isArray(parsed) ? parsed.map((link) => ({ label: String(link?.label ?? ''), url: String(link?.url ?? '') })) : []
    } catch {
      throw new Error('Links could not be read.')
    }
    const linksError = validateLinks(links)
    if (linksError) throw new Error(linksError)
    normalizedLinks = normalizeLinks(links)
  }
  const supabase = await createServerClient(); const result = await supabase.from('profiles').update(input).eq('owner_id', account.id)
  if (result.error) throw new Error('Unable to save profile')
  if (normalizedLinks !== null) {
    const { error: linksError } = await supabase.rpc('replace_own_profile_links', { p_links: normalizedLinks })
    if (linksError) throw new Error('Unable to update profile links.')
  }
  revalidatePath('/dashboard')
}

export async function publishProfile() {
  const account = await requireAuthenticatedAccount(); const supabase = await createServerClient()
  const { data, error: profileError } = await supabase.from('profiles').select('slug').eq('owner_id', account.id).single()
  if (profileError || !data) throw new Error('Create your profile before publishing.')
  const { error } = await supabase.rpc('complete_own_onboarding_publish', { p_publish: true })
  if (error) throw new Error('Unable to publish profile')
  revalidatePath(`/${data.slug}`); revalidatePath('/dashboard')
}

export async function unpublishProfile() {
  await requireAuthenticatedAccount(); const supabase = await createServerClient()
  const { data: slug, error } = await supabase.rpc('unpublish_own_profile')
  if (error || typeof slug !== 'string' || !slug) throw new Error('Unable to unpublish profile')
  revalidatePath(`/${slug}`)
  revalidatePath('/dashboard')
}
