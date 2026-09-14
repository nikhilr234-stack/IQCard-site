export type ProfileStatus = 'draft' | 'published'

export type ProfileLink = {
  id: string
  profile_id: string
  label: string
  url: string
  sort_order: number
}

export type Profile = {
  id: string
  owner_id: string
  slug: string
  status: ProfileStatus
  full_name: string
  headline: string
  tagline: string
  bio: string
  phone: string
  email: string
  whatsapp: string
  location: string
  public_email_visible: boolean
  phone_visible: boolean
  whatsapp_visible: boolean
  location_visible: boolean
  photo_path: string | null
  photo_url?: string | null
  published_at: string | null
  profile_links: ProfileLink[]
}
