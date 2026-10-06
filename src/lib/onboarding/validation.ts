import { normalizeHandoffEmail } from '@/lib/checkout/handoff'
import {
  isValidContactNumber,
  isValidProfileLinkUrl,
  isValidPublicEmail,
  normalizeProfileLinkUrl,
  normalizePublicEmail,
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_HEADLINE_MAX_LENGTH,
  PROFILE_LOCATION_MAX_LENGTH,
  suggestSlug,
  validateProfileNameParts,
  validateSlug,
} from '@/lib/profile/validation'
import type { LinkInput } from '@/lib/profile/links'

type FieldErrors = Record<string, string>
type ValidationResult<T> = { ok: true; value: T } | { ok: false; fieldErrors: FieldErrors }

function result<T>(value: T, fieldErrors: FieldErrors): ValidationResult<T> {
  return Object.keys(fieldErrors).length ? { ok: false, fieldErrors } : { ok: true, value }
}

export function validateIdentityStep(input: {
  firstName?: string
  lastName?: string
  headline?: string
  bio?: string
}): ValidationResult<{ firstName: string; lastName: string; fullName: string; headline: string; bio: string }> {
  const nameValidation = validateProfileNameParts(input)
  const { firstName, lastName, fullName } = nameValidation.value
  const headline = input.headline?.trim() ?? ''
  const bio = input.bio?.trim() ?? ''
  const fieldErrors: FieldErrors = { ...nameValidation.fieldErrors }

  if (!firstName) fieldErrors.firstName = 'Enter your first name.'
  if (!lastName) fieldErrors.lastName = 'Enter your last name.'

  if (headline.length > PROFILE_HEADLINE_MAX_LENGTH) fieldErrors.headline = `Role or title must be ${PROFILE_HEADLINE_MAX_LENGTH} characters or fewer.`
  if (bio.length > PROFILE_BIO_MAX_LENGTH) fieldErrors.bio = `Biography must be ${PROFILE_BIO_MAX_LENGTH} characters or fewer.`

  return result({ firstName, lastName, fullName, headline, bio }, fieldErrors)
}

export function validateContactStep(input: {
  publicEmail?: string
  phone?: string
  whatsapp?: string
  location?: string
}): ValidationResult<{ publicEmail: string; phone: string; whatsapp: string; location: string }> {
  const publicEmail = normalizePublicEmail(input.publicEmail)
  const phone = input.phone?.trim() ?? ''
  const whatsapp = input.whatsapp?.trim() ?? ''
  const location = input.location?.trim() ?? ''
  const fieldErrors: FieldErrors = {}

  if (!isValidPublicEmail(publicEmail)) fieldErrors.publicEmail = 'Enter a valid public email address.'
  if (!isValidContactNumber(phone)) fieldErrors.phone = 'Enter a valid phone number with country code.'
  if (!isValidContactNumber(whatsapp)) fieldErrors.whatsapp = 'Enter a valid WhatsApp number with country code.'
  if (location.length > PROFILE_LOCATION_MAX_LENGTH) fieldErrors.location = `Location must be ${PROFILE_LOCATION_MAX_LENGTH} characters or fewer.`

  return result({ publicEmail, phone, whatsapp, location }, fieldErrors)
}

export function validateContentStep(input: LinkInput[]): ValidationResult<LinkInput[]> {
  const fieldErrors: FieldErrors = {}
  const links = input.map((link) => ({ label: link.label.trim(), url: normalizeProfileLinkUrl(link.url) }))
    .filter((link) => link.label || link.url)

  if (links.length > 12) fieldErrors.links = 'Add no more than 12 links.'
  links.forEach((link, index) => {
    if (!link.label) fieldErrors[`links.${index}.label`] = 'Add a label or remove this link.'
    else if (link.label.length > 60) fieldErrors[`links.${index}.label`] = 'Link labels must be 60 characters or fewer.'
    if (!link.url) {
      fieldErrors[`links.${index}.url`] = 'Add a URL or remove this link.'
      return
    }
    try {
      const protocol = new URL(link.url).protocol
      if (!['https:', 'mailto:', 'tel:'].includes(protocol) || !isValidProfileLinkUrl(link.url)) throw new Error('Invalid link')
    } catch {
      fieldErrors[`links.${index}.url`] = 'Use a secure HTTPS, email, or phone link.'
    }
  })

  return result(links, fieldErrors)
}

export function validateAddressStep(input: { slug?: string }): ValidationResult<{ slug: string }> {
  const slug = suggestSlug(input.slug ?? '')
  const slugError = validateSlug(slug)
  return slugError ? { ok: false, fieldErrors: { slug: slugError } } : { ok: true, value: { slug } }
}

export function validatePublicationReadiness(input: {
  verifiedEmail?: string
  fullName?: string
  slug?: string
}): ValidationResult<{ verifiedEmail: string; fullName: string; slug: string }> {
  const verifiedEmail = input.verifiedEmail?.trim().toLowerCase() ?? ''
  const fullName = input.fullName?.trim() ?? ''
  const slug = input.slug?.trim() ?? ''
  const fieldErrors: FieldErrors = {}

  if (!normalizeHandoffEmail(verifiedEmail)) fieldErrors.verifiedEmail = 'Confirm your email before publishing.'
  if (!slug) fieldErrors.slug = 'Choose your public profile URL.'
  else {
    const slugError = validateSlug(slug)
    if (slugError) fieldErrors.slug = slugError
  }

  return result({ verifiedEmail, fullName, slug }, fieldErrors)
}
