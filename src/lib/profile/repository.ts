import { createPublicClient, createServerClient } from '@/lib/supabase/server'
import type { CoverPresentation, Profile } from './types'
import { createDefaultProfileDraft } from './defaults'
import { DEFAULT_PRESENTATION, normalizePresentation } from './presentation'

export function profilePhotoUrl(path: string | null | undefined): string | null {
  return path ? `/api/profile-photo?path=${encodeURIComponent(path)}` : null
}

function isPresentationSchemaUnavailable(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || Boolean(error?.message?.includes('profile_presentations'))
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
  const supabase = createPublicClient()
  const { data } = await supabase.from('profiles').select('*, profile_links(*)').eq('slug', slug).eq('status', 'published').maybeSingle()
  return data ? withPhotoUrl({ ...data, profile_links: data.profile_links ?? [] }) as Profile : null
}

export async function getOwnProfilePresentation(ownerId: string): Promise<CoverPresentation> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('profile_presentations')
    .select('draft, profiles!inner(owner_id)')
    .eq('profiles.owner_id', ownerId)
    .maybeSingle()

  // Keep existing Minimal profiles available during a rolling deployment where
  // the app is live slightly before the accompanying database migration.
  if (error && !isPresentationSchemaUnavailable(error)) throw error
  if (error) return DEFAULT_PRESENTATION.draft
  if (data === null) return DEFAULT_PRESENTATION.draft
  if (!data) throw new Error('Unable to load your profile presentation')
  return normalizePresentation({ draft: data.draft }).draft
}

export async function getPublishedProfilePresentation(profileId: string): Promise<CoverPresentation> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('published_profile_presentations')
    .select('published')
    .eq('profile_id', profileId)
    .maybeSingle()

  // See the owner reader above: this preserves the established public profile
  // experience until the new presentation table/view has been applied.
  if (error && !isPresentationSchemaUnavailable(error)) throw error
  if (error) return DEFAULT_PRESENTATION.published
  if (data === null) return DEFAULT_PRESENTATION.published
  if (!data) throw new Error('Unable to load published profile presentation')
  return normalizePresentation({ published: data.published }).published
}

export async function getPublishedProfilePresentationBySlug(slug: string): Promise<CoverPresentation> {
  const supabase = createPublicClient()
  const { data, error } = await supabase
    .from('published_profile_presentations')
    .select('published')
    .eq('slug', slug)
    .maybeSingle()

  if (error && !isPresentationSchemaUnavailable(error)) throw error
  if (error || data === null) return DEFAULT_PRESENTATION.published
  if (!data) throw new Error('Unable to load published profile presentation')
  return normalizePresentation({ published: data.published }).published
}
