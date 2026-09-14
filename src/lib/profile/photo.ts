export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024

const allowedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export type ProfilePhotoValidation = { ok: true } | { ok: false; error: string }

export function validateProfilePhoto(file: unknown): ProfilePhotoValidation {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Choose a photo first.' }
  if (!allowedPhotoTypes.has(file.type)) return { ok: false, error: 'Use a JPEG, PNG, or WebP image.' }
  if (file.size > PROFILE_PHOTO_MAX_BYTES) return { ok: false, error: 'Photos must be 5 MB or smaller.' }
  return { ok: true }
}
