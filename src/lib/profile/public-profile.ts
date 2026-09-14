import type { Profile } from './types'
import { isValidProfileLinkUrl } from './validation'

export function safeExternalUrl(value: string) {
  try {
    const url = new URL(value)
    return isValidProfileLinkUrl(value) ? url.toString() : null
  } catch {
    return null
  }
}

export function buildPublicProfileView(profile: Profile) {
  const links = [...(profile.profile_links ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((link) => ({ label: link.label, url: safeExternalUrl(link.url) }))
    .filter((link): link is { label: string; url: string } => Boolean(link.url))
  const whatsappDigits = profile.whatsapp.replace(/\D/g, '')
  const initials = profile.full_name.trim().split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'IQ'

  return {
    initials,
    links,
    saveContactHref: `/api/contact/${profile.slug}`,
    callHref: profile.phone_visible && profile.phone ? `tel:${profile.phone}` : null,
    emailHref: profile.public_email_visible && profile.email ? `mailto:${profile.email}` : null,
    whatsappHref: profile.whatsapp_visible && whatsappDigits ? `https://wa.me/${whatsappDigits}` : null,
    publicPhone: profile.phone_visible ? profile.phone : '',
    publicEmail: profile.public_email_visible ? profile.email : '',
    location: profile.location_visible && profile.location ? profile.location : null,
  }
}
