import { createAdminClient } from '@/lib/supabase/admin'

export type GiftProfileLinkInput = { label: string; url: string }

export type CreateGiftProfileInput = {
  profileId: string
  fullName: string
  recipientEmail: string
  role: string
  tagline: string
  phone: string
  whatsapp: string
  location: string
  photoPath: string | null
  coverPath: string | null
  links: GiftProfileLinkInput[]
}

export type CreatedGiftProfile = { profileId: string; slug: string }

function parseCreatedGift(value: unknown): CreatedGiftProfile | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const result = row as Record<string, unknown>
  if (typeof result.profile_id !== 'string' || typeof result.slug !== 'string') return null
  return { profileId: result.profile_id, slug: result.slug }
}

export async function createGiftProfile(input: CreateGiftProfileInput): Promise<CreatedGiftProfile> {
  const { data, error } = await createAdminClient().rpc('admin_create_and_publish_gift_profile', {
    p_profile_id: input.profileId,
    p_full_name: input.fullName,
    p_recipient_email: input.recipientEmail,
    p_role: input.role,
    p_tagline: input.tagline,
    p_phone: input.phone,
    p_whatsapp: input.whatsapp,
    p_location: input.location,
    p_photo_path: input.photoPath,
    p_cover_path: input.coverPath,
    p_links: input.links,
  })

  if (error) throw new Error('Unable to create gift profile')
  const gift = parseCreatedGift(data)
  if (!gift) throw new Error('Unable to create gift profile')
  return gift
}
