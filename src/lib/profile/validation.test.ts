import { describe, expect, it } from 'vitest'
import {
  isReservedSlug,
  suggestSlug,
  validateEditableProfile,
  validateLinkInput,
  validateProfileInput,
  validateSlug,
} from './validation'

const editableProfile = {
  slug: 'ada-lovelace',
  full_name: 'Ada Lovelace',
  headline: 'Mathematician',
  bio: 'Writes analytical engines.',
  email: 'ada@example.com',
  phone: '+44 20 1234 5678',
  whatsapp: '+44 7700 900123',
  location: 'London',
  public_email_visible: true,
  phone_visible: true,
  whatsapp_visible: true,
  location_visible: true,
}

describe('profile slugs', () => {
  it('reserves the legacy iq landing slug', () => {
    expect(validateSlug('iq')).toBe('That profile URL is reserved.')
  })

  it('suggests a URL from a name', () => expect(suggestSlug('Nikhil Rakesh')).toBe('nikhil-rakesh'))
  it('rejects reserved paths', () => expect(isReservedSlug('admin')).toBe(true))
  it('reserves registration and onboarding routes', () => {
    expect(isReservedSlug('register')).toBe(true)
    expect(isReservedSlug('onboarding')).toBe(true)
    expect(isReservedSlug('customize')).toBe(true)
  })
  it('rejects invalid slug characters', () => expect(validateSlug('Nikhil Rakesh')).toBe('Use lowercase letters, numbers, and hyphens only.'))

  it('rejects empty names when publishing', () => {
    expect(validateProfileInput({ full_name: '', slug: 'nikhil-rakesh' })).toEqual({ ok: false, error: 'Add your name before publishing.' })
  })

  it('rejects unsafe custom link schemes', () => {
    expect(validateLinkInput('Website', 'javascript:alert(1)')).toBe('Use an HTTP(S) link or a contact link.')
  })

  it('accepts secure custom links', () => {
    expect(validateLinkInput('Website', 'https://example.com')).toBeNull()
  })
})

describe('editable profile validation', () => {
  it('normalizes dashboard fields while preserving intentionally false visibility choices', () => {
    expect(validateEditableProfile({
      ...editableProfile,
      slug: '  Ada Lovelace  ',
      full_name: '  Ada   King   Lovelace  ',
      headline: '  Mathematician  ',
      bio: '  Writes analytical engines.  ',
      email: '  ADA@EXAMPLE.COM  ',
      phone: '  +44 20 1234 5678  ',
      whatsapp: '  +44 7700 900123  ',
      location: '  London  ',
      public_email_visible: false,
      phone_visible: false,
      whatsapp_visible: false,
      location_visible: false,
    })).toEqual({
      ok: true,
      value: {
        ...editableProfile,
        full_name: 'Ada King Lovelace',
        public_email_visible: false,
        phone_visible: false,
        whatsapp_visible: false,
        location_visible: false,
      },
    })
  })

  it.each([
    ['Ada', 'Add both your first name and last name.'],
    ['Your Name', 'Enter your real name.'],
    [`${'A'.repeat(81)} Lovelace`, 'First name must be 80 characters or fewer.'],
    [`Ada ${'L'.repeat(81)}`, 'Last name must be 80 characters or fewer.'],
  ])('applies onboarding name rules to %s', (fullName, message) => {
    expect(validateEditableProfile({ ...editableProfile, full_name: fullName })).toMatchObject({
      ok: false,
      fieldErrors: { full_name: message },
    })
  })

  it('accepts a first name followed by a multi-token last name', () => {
    expect(validateEditableProfile({
      ...editableProfile,
      full_name: '  Ada   King   Lovelace  ',
    })).toMatchObject({
      ok: true,
      value: { full_name: 'Ada King Lovelace' },
    })
  })

  it.each([
    ['full_name', '', 'Add both your first name and last name.'],
    ['headline', 'H'.repeat(121), 'Role or title must be 120 characters or fewer.'],
    ['bio', 'B'.repeat(501), 'Biography must be 500 characters or fewer.'],
    ['email', 'not-an-email', 'Enter a valid public email address.'],
    ['phone', 'abc', 'Enter a valid phone number with country code.'],
    ['whatsapp', '+1 23', 'Enter a valid WhatsApp number with country code.'],
    ['location', 'L'.repeat(121), 'Location must be 120 characters or fewer.'],
  ] as const)('rejects an invalid %s value', (field, value, message) => {
    expect(validateEditableProfile({ ...editableProfile, [field]: value })).toMatchObject({
      ok: false,
      fieldErrors: { [field]: message },
    })
  })
})
