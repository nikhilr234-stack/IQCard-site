import { describe, expect, it } from 'vitest'
import {
  validateAddressStep,
  validateContactStep,
  validateContentStep,
  validateIdentityStep,
  validatePublicationReadiness,
} from './validation'

describe('onboarding step validation', () => {
  it('allows an optional identity name', () => {
    expect(validateIdentityStep({ firstName: '', lastName: '' })).toMatchObject({ ok: true })
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
