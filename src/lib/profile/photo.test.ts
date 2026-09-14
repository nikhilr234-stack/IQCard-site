import { describe, expect, it } from 'vitest'
import { PROFILE_PHOTO_MAX_BYTES, validateProfilePhoto } from './photo'

function photo(type: string, size: number) {
  return new File([new Uint8Array(size)], 'portrait', { type })
}

describe('profile photo validation', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts a %s photo at the 5 MB boundary', (type) => {
    expect(validateProfilePhoto(photo(type, 5 * 1024 * 1024))).toEqual({ ok: true })
  })

  it('rejects a photo that exceeds the maximum upload size', () => {
    expect(validateProfilePhoto(photo('image/png', 5 * 1024 * 1024 + 1))).toEqual({
      ok: false,
      error: 'Photos must be 5 MB or smaller.',
    })
  })

  it('rejects an unsupported image type', () => {
    expect(validateProfilePhoto(photo('image/gif', 1))).toEqual({
      ok: false,
      error: 'Use a JPEG, PNG, or WebP image.',
    })
  })

  it('uses the shared maximum for the boundary that validation accepts', () => {
    expect(validateProfilePhoto(photo('image/webp', PROFILE_PHOTO_MAX_BYTES))).toEqual({ ok: true })
  })
})
