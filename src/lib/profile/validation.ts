import { normalizeHandoffEmail } from '@/lib/checkout/handoff'

const reserved = new Set(['admin', 'api', 'auth', 'dashboard', 'login', 'iq', 'register', 'onboarding', 'customize', 'claim-gift'])

export const PROFILE_NAME_PART_MAX_LENGTH = 80
export const PROFILE_FULL_NAME_MAX_LENGTH = PROFILE_NAME_PART_MAX_LENGTH * 2 + 1
export const PROFILE_HEADLINE_MAX_LENGTH = 120
export const PROFILE_BIO_MAX_LENGTH = 500
export const PROFILE_LOCATION_MAX_LENGTH = 120
export const PROFILE_LINK_URL_MAX_LENGTH = 2048
const validPortPattern = '(?:[1-9]\\d{0,3}|[1-5]\\d{4}|6[0-4]\\d{3}|65[0-4]\\d{2}|655[0-2]\\d|6553[0-5])'
// IPv6 literals and percent-bearing hosts are intentionally unsupported here:
// the same conservative domain/IPv4 grammar is enforced in PostgreSQL.
const webHostPattern = '[a-z0-9.-]+'
const webLinkPattern = new RegExp(`^https?:\\/\\/(${webHostPattern})(?::${validPortPattern})?(?:[/?#][^\\s]*)?$`, 'i')
const mailtoLinkPattern = /^mailto:[^\s?]+(?:\?[^\s]*)?$/i
const telLinkPattern = /^tel:[+\d][\d\s().-]+$/i
const dnsLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i
const ipv4OctetPattern = /^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/

function isValidDomainOrIpv4Host(host: string): boolean {
  if (!host || host.length > 253) return false
  if (/^[0-9.]+$/.test(host)) {
    const octets = host.split('.')
    return octets.length === 4 && octets.every((octet) => ipv4OctetPattern.test(octet))
  }
  return host.split('.').every((label) => dnsLabelPattern.test(label))
}

export function isValidProfileLinkUrl(input: string): boolean {
  const value = input.trim()
  if (!value || value.length > PROFILE_LINK_URL_MAX_LENGTH) return false
  try {
    const parsed = new URL(value)
    const webMatch = webLinkPattern.exec(value)
    if ((parsed.protocol === 'http:' || parsed.protocol === 'https:') && webMatch) {
      return isValidDomainOrIpv4Host(webMatch[1])
    }
    if (parsed.protocol === 'mailto:') {
      const address = decodeURIComponent(parsed.pathname)
      return mailtoLinkPattern.test(value) && /^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(address)
    }
    return parsed.protocol === 'tel:' && telLinkPattern.test(value) && isValidContactNumber(decodeURIComponent(parsed.pathname))
  } catch {
    return false
  }
}

export type ProfileValidationInput = {
  full_name?: string | null
  slug?: string | null
}

export type EditableProfileInput = {
  slug?: string | null
  full_name?: string | null
  headline?: string | null
  bio?: string | null
  email?: string | null
  phone?: string | null
  whatsapp?: string | null
  location?: string | null
  public_email_visible?: boolean
  phone_visible?: boolean
  whatsapp_visible?: boolean
  location_visible?: boolean
}

export type EditableProfile = {
  slug: string
  full_name: string
  headline: string
  bio: string
  email: string
  phone: string
  whatsapp: string
  location: string
  public_email_visible: boolean
  phone_visible: boolean
  whatsapp_visible: boolean
  location_visible: boolean
}

type EditableProfileField = keyof EditableProfile
type EditableProfileValidation =
  | { ok: true; value: EditableProfile }
  | { ok: false; fieldErrors: Partial<Record<EditableProfileField, string>> }

type ProfileNameField = 'firstName' | 'lastName'

export function validateProfileNameParts(input: {
  firstName?: string | null
  lastName?: string | null
}): {
  value: { firstName: string; lastName: string; fullName: string }
  fieldErrors: Partial<Record<ProfileNameField, string>>
} {
  const firstName = input.firstName?.trim().replace(/\s+/g, ' ') ?? ''
  const lastName = input.lastName?.trim().replace(/\s+/g, ' ') ?? ''
  const fullName = `${firstName} ${lastName}`.trim()
  const fieldErrors: Partial<Record<ProfileNameField, string>> = {}

  if (firstName.length > PROFILE_NAME_PART_MAX_LENGTH) fieldErrors.firstName = `First name must be ${PROFILE_NAME_PART_MAX_LENGTH} characters or fewer.`
  if (lastName.length > PROFILE_NAME_PART_MAX_LENGTH) fieldErrors.lastName = `Last name must be ${PROFILE_NAME_PART_MAX_LENGTH} characters or fewer.`
  if (fullName.toUpperCase() === 'YOUR NAME') fieldErrors.firstName = 'Enter your real name.'

  return { value: { firstName, lastName, fullName }, fieldErrors }
}

export function suggestSlug(name: string) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function isReservedSlug(slug: string) { return reserved.has(slug) }

export function normalizePublicEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ''
}

export function isValidPublicEmail(value: string): boolean {
  return !value || normalizeHandoffEmail(value) !== null
}

export function isValidContactNumber(value: string): boolean {
  if (!value) return true
  const digits = value.replace(/\D/g, '')
  return /^[+\d][\d\s().-]+$/.test(value) && digits.length >= 7 && digits.length <= 15
}

export function validateSlug(slug: string): string | null {
  if (!slug) return 'Choose a profile URL.'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase letters, numbers, and hyphens only.'
  if (isReservedSlug(slug)) return 'That profile URL is reserved.'
  return null
}

export function validateProfileInput(input: ProfileValidationInput): { ok: true } | { ok: false; error: string } {
  const fullName = input.full_name?.trim() ?? ''
  if (!fullName) return { ok: false, error: 'Add your name before publishing.' }
  const slugError = validateSlug(input.slug?.trim() ?? '')
  if (slugError) return { ok: false, error: slugError }
  return { ok: true }
}

export function validateEditableProfile(input: EditableProfileInput): EditableProfileValidation {
  const nameTokens = input.full_name?.trim().split(/\s+/).filter(Boolean) ?? []
  const nameValidation = validateProfileNameParts({
    firstName: nameTokens[0],
    lastName: nameTokens.slice(1).join(' '),
  })
  const value: EditableProfile = {
    slug: suggestSlug(input.slug ?? ''),
    full_name: nameValidation.value.fullName,
    headline: input.headline?.trim() ?? '',
    bio: input.bio?.trim() ?? '',
    email: normalizePublicEmail(input.email),
    phone: input.phone?.trim() ?? '',
    whatsapp: input.whatsapp?.trim() ?? '',
    location: input.location?.trim() ?? '',
    public_email_visible: input.public_email_visible === true,
    phone_visible: input.phone_visible === true,
    whatsapp_visible: input.whatsapp_visible === true,
    location_visible: input.location_visible === true,
  }
  const fieldErrors: Partial<Record<EditableProfileField, string>> = {}
  const slugError = validateSlug(value.slug)

  if (slugError) fieldErrors.slug = slugError
  if (!nameValidation.value.firstName || !nameValidation.value.lastName) {
    fieldErrors.full_name = 'Add both your first name and last name.'
  } else if (nameValidation.fieldErrors.firstName || nameValidation.fieldErrors.lastName) {
    fieldErrors.full_name = nameValidation.fieldErrors.firstName ?? nameValidation.fieldErrors.lastName
  }
  if (value.headline.length > PROFILE_HEADLINE_MAX_LENGTH) fieldErrors.headline = `Role or title must be ${PROFILE_HEADLINE_MAX_LENGTH} characters or fewer.`
  if (value.bio.length > PROFILE_BIO_MAX_LENGTH) fieldErrors.bio = `Biography must be ${PROFILE_BIO_MAX_LENGTH} characters or fewer.`
  if (!isValidPublicEmail(value.email)) fieldErrors.email = 'Enter a valid public email address.'
  if (!isValidContactNumber(value.phone)) fieldErrors.phone = 'Enter a valid phone number with country code.'
  if (!isValidContactNumber(value.whatsapp)) fieldErrors.whatsapp = 'Enter a valid WhatsApp number with country code.'
  if (value.location.length > PROFILE_LOCATION_MAX_LENGTH) fieldErrors.location = `Location must be ${PROFILE_LOCATION_MAX_LENGTH} characters or fewer.`

  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true, value }
}

export function validateLinkInput(label: string, url: string): string | null {
  if (!label.trim()) return 'Add a label for this link.'
  if (label.trim().length > 60) return 'Link labels must be 60 characters or fewer.'
  const value = url.trim()
  if (value.length > PROFILE_LINK_URL_MAX_LENGTH) return `Link URLs must be ${PROFILE_LINK_URL_MAX_LENGTH} characters or fewer.`
  if (isValidProfileLinkUrl(value)) return null
  return 'Use an HTTP(S) link or a contact link.'
}
