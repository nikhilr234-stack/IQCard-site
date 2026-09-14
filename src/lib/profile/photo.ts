export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024

export const PROFILE_PHOTO_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type ProfilePhotoValidation = { ok: true } | { ok: false; error: string }

export function isProfilePhotoContentType(value: string): boolean {
  return PROFILE_PHOTO_CONTENT_TYPES.has(value)
}

export function validateProfilePhoto(file: unknown): ProfilePhotoValidation {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a photo first.' }
  if (!isProfilePhotoContentType(file.type)) return { ok: false, error: 'Use a JPEG, PNG, or WebP image.' }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return { ok: false, error: 'Photos must be 5 MB or smaller.' }
  return { ok: true }
}
