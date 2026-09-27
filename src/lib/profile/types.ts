import type { TemplateSettings } from './template-variants'

export type ProfileStatus = 'draft' | 'published'

export type ProfileTemplate = 'minimal' | 'cover' | 'studio' | 'executive' | 'signal' | 'index'

export type ProfileDesign = {
  version: 1
  /** Rendering-only marker; normalizeDesign never persists this field. */
  effectiveLinkStyleFallback?: boolean
  theme: 'light' | 'dark' | 'auto'
  background: { color: string; text: string | 'auto'; accent: string }
  typography: {
    family: 'neo' | 'serif' | 'mono' | 'humanist'
    scale: 'compact' | 'balanced' | 'large'
    weight: 'regular' | 'medium' | 'bold'
  }
  profile: {
    photoShape: 'circle' | 'rounded' | 'square'
    photoSize: 'small' | 'medium' | 'large'
    alignment: 'left' | 'center'
  }
  links: {
    style: 'icons' | 'pills' | 'rows' | 'cards'
    showIcons: boolean
    iconStyle: 'brand' | 'mono'
    radius: 'square' | 'soft' | 'round'
    density: 'compact' | 'comfortable'
  }
  buttons: { style: 'solid' | 'outline' | 'soft'; radius: 'square' | 'soft' | 'pill' }
  footer: { showMadeWithIq: boolean; showProfessionalLabel: boolean }
}

export type NormalizedCoverPresentation = {
  template: ProfileTemplate
  cover: {
    coverPath: string | null
    overlay: number
    focalY: number
    alignment: 'lower-left' | 'center'
    photoPathOverride: string | null
  }
  design: ProfileDesign
  templateSettings: TemplateSettings
}

export type CoverPresentation = {
  template: ProfileTemplate
  cover: {
    coverPath: string | null
    overlay: number
    focalY: number
    alignment: 'lower-left' | 'center'
    photoPathOverride: string | null
  }
  design?: ProfileDesign
  templateSettings?: TemplateSettings
}

export type ProfilePresentation = {
  profile_id?: string
  draft: NormalizedCoverPresentation
  published: NormalizedCoverPresentation
}

export type ProfileLink = {
  id: string
  profile_id: string
  label: string
  url: string
  sort_order: number
}

export type Profile = {
  id: string
  owner_id: string | null
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
