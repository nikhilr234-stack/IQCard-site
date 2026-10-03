import { createPublicClient, createServerClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import type { CoverPresentation, Profile } from './types'
import { createDefaultProfileDraft } from './defaults'
import { DEFAULT_PRESENTATION, normalizePresentation } from './presentation'
import { redirect } from 'next/navigation'
import { discoverOwnGiftProfile } from '@/lib/gifts/claims'

export function profilePhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (path.startsWith('/api/gift-media?')) return path
  return `/api/profile-photo?path=${encodeURIComponent(path)}`
}

function giftAssetUrl(slug: string, asset: 'portrait' | 'cover') {
  return `/api/gift-media?slug=${encodeURIComponent(slug)}&asset=${asset}`
}

function giftAsset(path: string | null | undefined): 'portrait' | 'cover' | null {
  if (!path?.startsWith('gift/')) return null
  const filename = path.split('/').at(-1) ?? ''
  if (filename.startsWith('portrait')) return 'portrait'
  if (filename.startsWith('cover')) return 'cover'
  return null
}

function mediaUrl(path: string | null | undefined, slug: string): string | null {
  if (!path) return null
  if (path.startsWith('/api/gift-media?')) return path
  const asset = giftAsset(path)
  return asset ? giftAssetUrl(slug, asset) : profilePhotoUrl(path)
}

function isPresentationSchemaUnavailable(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '42P01'
    || error?.code === 'PGRST205'
    || Boolean(error?.message?.includes('profile_presentations'))
}

function withPhotoUrl<T extends { photo_path?: string | null }>(profile: T) {
  if (!profile.photo_path) return { ...profile, photo_url: null }
  const asset = giftAsset(profile.photo_path)
  return {
    ...profile,
    ...(asset ? { photo_path: null } : {}),
    photo_url: mediaUrl(profile.photo_path, 'slug' in profile && typeof profile.slug === 'string' ? profile.slug : ''),
  }
}

function publicPresentation(presentation: CoverPresentation, slug: string): CoverPresentation {
  const cover = presentation.cover
  const coverAsset = giftAsset(cover.coverPath)
  return {
    ...presentation,
    cover: {
      ...cover,
      coverPath: coverAsset ? giftAssetUrl(slug, coverAsset) : cover.coverPath,
      photoPathOverride: mediaUrl(cover.photoPathOverride, slug),
    },
  }
}

function ownerPresentation(presentation: CoverPresentation, slug: string): CoverPresentation {
  const assetUrl = (path: string | null) => {
    if (path?.startsWith('/api/gift-media?')) return path
    const asset = giftAsset(path)
    return asset ? giftAssetUrl(slug, asset) : path
  }
  return { ...presentation, cover: { ...presentation.cover, coverPath: assetUrl(presentation.cover.coverPath), photoPathOverride: assetUrl(presentation.cover.photoPathOverride) } }
}

export async function getOwnProfile(user: { id: string; email: string }, preferredFullName: string | null = null): Promise<Profile> {
  const supabase = await createServerClient()
  const { data } = await supabase.from('profiles').select('*, profile_links(*)').eq('owner_id', user.id).maybeSingle()
  if (data) return withPhotoUrl({ ...data, profile_links: data.profile_links ?? [] }) as Profile
  const gift = await discoverOwnGiftProfile()
  if (gift.status !== 'none') redirect('/claim-gift')
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
  return unstable_cache(async () => {
    const supabase = createPublicClient()
    const { data } = await supabase.from('profiles').select('*, profile_links(*)').eq('slug', slug).eq('status', 'published').maybeSingle()
    return data ? withPhotoUrl({ ...data, profile_links: data.profile_links ?? [] }) as Profile : null
  }, ['published-profile', slug], {
    revalidate: 60,
    tags: [`published-profile:${slug}`],
  })()
}

export async function getOwnProfilePresentation(ownerId: string): Promise<CoverPresentation> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('profile_presentations')
    .select('draft, profiles!inner(owner_id, slug)')
    .eq('profiles.owner_id', ownerId)
    .maybeSingle()

  // Keep existing Minimal profiles available during a rolling deployment where
  // the app is live slightly before the accompanying database migration.
  if (error && !isPresentationSchemaUnavailable(error)) throw error
  if (error) return DEFAULT_PRESENTATION.draft
  if (data === null) return DEFAULT_PRESENTATION.draft
  if (!data) throw new Error('Unable to load your profile presentation')
  const slug = (data.profiles as { slug?: string } | null)?.slug ?? ''
  return ownerPresentation(normalizePresentation({ draft: data.draft }).draft, slug)
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
  return unstable_cache(async () => {
    const supabase = createPublicClient()
    const { data, error } = await supabase
      .from('published_profile_presentations')
      .select('published')
      .eq('slug', slug)
      .maybeSingle()

    if (error && !isPresentationSchemaUnavailable(error)) throw error
    if (error || data === null) return DEFAULT_PRESENTATION.published
    if (!data) throw new Error('Unable to load published profile presentation')
    return publicPresentation(normalizePresentation({ published: data.published }).published, slug)
  }, ['published-presentation', slug], {
    revalidate: 60,
    tags: [`published-profile:${slug}`],
  })()
}
