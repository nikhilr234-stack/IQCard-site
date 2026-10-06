import { describe, expect, it } from 'vitest'
import {
  validateAddressStep,
  validateContactStep,
  validateContentStep,
  validateIdentityStep,
  validatePublicationReadiness,
} from './validation'

describe('onboarding step validation', () => {
  it.each([
    ['example.com', 'https://example.com'],
    ['example.in', 'https://example.in'],
    [' www.example.co.in/work?x=1#about ', 'https://www.example.co.in/work?x=1#about'],
  ])('saves a bare website address during setup: %s', (url, expected) => {
    expect(validateContentStep([{ label: ' Website ', url }])).toEqual({
      ok: true, value: [{ label: 'Website', url: expected }],
    })
  })

  it.each(['example..com', 'example-.in', 'https://example.com:0', `example.com/${'a'.repeat(2030)}`])('rejects invalid website addresses during setup: %s', (url) => {
    expect(validateContentStep([{ label: 'Website', url }])).toMatchObject({ ok: false })
  })

  it('requires a first and last name for the public profile', () => {
    expect(validateIdentityStep({ firstName: '', lastName: '' })).toMatchObject({
      ok: false,
      fieldErrors: { firstName: 'Enter your first name.', lastName: 'Enter your last name.' },
    })
    expect(validateIdentityStep({ firstName: 'Nikhil', lastName: 'Rakesh', headline: '', bio: '' })).toMatchObject({
      ok: true,
      value: { firstName: 'Nikhil', lastName: 'Rakesh', fullName: 'Nikhil Rakesh' },
    })
  })

  it('allows empty contact fields and explains invalid values', () => {
    expect(validateContactStep({ publicEmail: '', phone: '', whatsapp: '', location: '' }).ok).toBe(true)
    expect(validateContactStep({ publicEmail: 'bad', phone: 'abc', whatsapp: '', location: '' })).toMatchObject({
      ok: false,
      fieldErrors: {
        publicEmail: 'Enter a valid public email address.',
        phone: 'Enter a valid phone number with country code.',
      },
    })
  })

  it('accepts empty link rows but requires both fields for a partially filled row', () => {
    expect(validateContentStep([{ label: '', url: '' }])).toEqual({ ok: true, value: [] })
    expect(validateContentStep([{ label: 'Portfolio', url: '' }])).toMatchObject({
      ok: false,
      fieldErrors: { 'links.0.url': 'Add a URL or remove this link.' },
    })
    expect(validateContentStep([{ label: 'Portfolio', url: 'javascript:alert(1)' }])).toMatchObject({
      ok: false,
      fieldErrors: { 'links.0.url': 'Use a secure HTTPS, email, or phone link.' },
    })
  })

  it('normalizes public addresses and rejects platform routes', () => {
    expect(validateAddressStep({ slug: ' Nikhil Rakesh ' })).toEqual({ ok: true, value: { slug: 'nikhil-rakesh' } })
    expect(validateAddressStep({ slug: 'onboarding' })).toMatchObject({ ok: false, fieldErrors: { slug: 'That profile URL is reserved.' } })
  })

  it('requires verified email and a slug before publication', () => {
    expect(validatePublicationReadiness({ verifiedEmail: '', fullName: 'Nikhil', slug: '' })).toMatchObject({
      ok: false,
      fieldErrors: {
        verifiedEmail: 'Confirm your email before publishing.',
        slug: 'Choose your public profile URL.',
      },
    })
  })
})
