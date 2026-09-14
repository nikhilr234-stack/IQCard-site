import { createServerClient } from '@/lib/supabase/server'
import type { Profile } from './types'
import { createDefaultProfileDraft } from './defaults'

export function profilePhotoUrl(path: string | null | undefined): string | null {
  return path ? `/api/profile-photo?path=${encodeURIComponent(path)}` : null
}

function withPhotoUrl<T extends { photo_path?: string | null }>(profile: T) {
  if (!profile.photo_path) return { ...profile, photo_url: null }
  return { ...profile, photo_url: profilePhotoUrl(profile.photo_path) }
}

export async function getOwnProfile(user: { id: string; email: string }, preferredFullName: string | null = null): Promise<Profile> {
  const supabase = await createServerClient()
  const { data } = await supabase.from('profiles').select('*, profile_links(*)').eq('owner_id', user.id).maybeSingle()
  if (data) return withPhotoUrl({ ...data, profile_links: data.profile_links ?? [] }) as Profile
  const { data: created, error } = await supabase.rpc('create_own_profile_draft', {
    p_full_name: preferredFullName?.trim() || null,
  })
  if (!error && created) return withPhotoUrl({ ...created, profile_links: [] }) as Profile

  // Fallback for projects where the server-controlled draft RPC migration is
  // not yet applied; the authenticated owner policy still protects this insert.
  const draft = createDefaultProfileDraft(preferredFullName?.trim() || 'Guest User', user.email)
  const { data: fallback, error: fallbackError } = await supabase
    .from('profiles')
    .insert({ owner_id: user.id, ...draft })
    .select('*')
    .single()
  if (fallbackError) throw new Error('Unable to create your profile draft')
  return withPhotoUrl({ ...fallback, profile_links: [] }) as Profile
}

export async function getPublishedProfile(slug: string): Promise<Profile | null> {
  const supabase = await createServerClient()
  const { data } = await supabase.from('profiles').select('*, profile_links(*)').eq('slug', slug).eq('status', 'published').maybeSingle()
  return data ? withPhotoUrl({ ...data, profile_links: data.profile_links ?? [] }) as Profile : null
}
