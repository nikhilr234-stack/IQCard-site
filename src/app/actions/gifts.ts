'use server'

import { randomUUID } from 'node:crypto'
import { requireAdminAccount } from '@/lib/auth/account'
import { validateLinks, normalizeLinks } from '@/lib/profile/links'
import { validateProfileNameParts, isValidPublicEmail, isValidContactNumber, isReservedSlug, suggestSlug } from '@/lib/profile/validation'
import { getPublicEnv } from '@/lib/env'
import { publicProfileUrl } from '@/lib/site-routing'
import { uploadGiftMedia, cleanupGiftMedia } from '@/lib/gifts/media'
import { createGiftProfile } from '@/lib/gifts/create'
import { createAdminClient } from '@/lib/supabase/admin'

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim()
const optionalFile = (form: FormData, key: string): File | null => {
  const value = form.get(key)
  return value instanceof File && value.size > 0 ? value : null
}

function giftLinks(form: FormData) {
  return normalizeLinks([
    { label: 'LinkedIn', url: text(form, 'linkedin') },
    { label: 'Instagram', url: text(form, 'instagram') },
    { label: 'Website', url: text(form, 'website') },
  ].filter((link) => link.url))
}

export async function createGift(form: FormData) {
  await requireAdminAccount()

  const fullName = text(form, 'fullName').replace(/\s+/g, ' ')
  const [firstName, ...lastNames] = fullName.split(' ')
  const name = validateProfileNameParts({ firstName, lastName: lastNames.join(' ') })
  const email = text(form, 'email').toLowerCase()
  const role = text(form, 'role')
  const tagline = text(form, 'tagline')
  const phone = text(form, 'phone')
  const whatsapp = text(form, 'whatsapp')
  const location = text(form, 'location')
  if (!firstName || !lastNames.length || name.fieldErrors.firstName || name.fieldErrors.lastName) return { ok: false as const, error: 'Enter the recipient’s full name.' }
  if (isReservedSlug(suggestSlug(name.value.fullName))) return { ok: false as const, error: 'That profile URL is reserved. Enter a name that creates a different address.' }
  if (!email || email.length > 320 || !isValidPublicEmail(email)) return { ok: false as const, error: 'Enter a valid recipient email.' }
  if (!role || role.length > 120) return { ok: false as const, error: 'Enter a role (up to 120 characters).' }
  if (tagline.length > 500 || location.length > 120 || !isValidContactNumber(phone) || !isValidContactNumber(whatsapp)) return { ok: false as const, error: 'Check the optional details and try again.' }

  const links = giftLinks(form)
  const linkError = validateLinks(links)
  if (linkError) return { ok: false as const, error: linkError }

  const profileId = randomUUID()
  const siteUrl = getPublicEnv().siteUrl
  let uploadedPaths: string[] = []
  try {
    const media = await uploadGiftMedia(profileId, { portrait: optionalFile(form, 'portrait'), cover: optionalFile(form, 'cover') })
    uploadedPaths = media.uploadedPaths
    const gift = await createGiftProfile({
      profileId, fullName: name.value.fullName, recipientEmail: email, role, tagline, phone, whatsapp, location,
      photoPath: media.photoPath, coverPath: media.coverPath, links,
    })
    return { ok: true as const, name: name.value.fullName, slug: gift.slug, profileId: gift.profileId, url: publicProfileUrl(siteUrl, gift.slug) }
  } catch {
    await cleanupGiftMedia(uploadedPaths)
    return { ok: false as const, error: 'Gift could not be created. Please check the details and try again.' }
  }
}

export async function updateGiftDetails(form: FormData) {
  await requireAdminAccount()
  const profileId = text(form, 'profileId')
  const inputName = text(form, 'fullName').replace(/\s+/g, ' ')
  const [firstName, ...lastNames] = inputName.split(' ')
  const checkedName = validateProfileNameParts({ firstName, lastName: lastNames.join(' ') })
  const fullName = checkedName.value.fullName
  const role = text(form, 'role')
  const tagline = text(form, 'tagline')
  const phone = text(form, 'phone')
  const whatsapp = text(form, 'whatsapp')
  const location = text(form, 'location')
  if (!profileId || !firstName || !lastNames.length || checkedName.fieldErrors.firstName || checkedName.fieldErrors.lastName || !role) return { ok: false as const, error: 'Enter a full name and role.' }
  if (fullName.length > 161 || role.length > 120 || tagline.length > 500 || location.length > 120 || !isValidContactNumber(phone) || !isValidContactNumber(whatsapp)) return { ok: false as const, error: 'Check the details and try again.' }
  const links = giftLinks(form)
  const linkError = validateLinks(links)
  if (linkError) return { ok: false as const, error: linkError }
  const { data, error } = await createAdminClient().rpc('admin_update_unclaimed_gift_profile', {
    p_profile_id: profileId, p_full_name: fullName, p_role: role, p_tagline: tagline,
    p_phone: phone, p_whatsapp: whatsapp, p_location: location, p_links: links,
  })
  if (error || !data) return { ok: false as const, error: 'This gift may already be claimed, or the details could not be saved.' }
  return { ok: true as const, slug: Array.isArray(data) ? data[0]?.slug : (data as { slug?: string }).slug }
}
