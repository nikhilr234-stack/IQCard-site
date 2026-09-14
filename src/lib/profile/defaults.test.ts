import { expect, it } from 'vitest'
import { createDefaultProfileDraft } from './defaults'

it('creates a draft with a suggested slug and account email', () => {
  expect(createDefaultProfileDraft('Nikhil Rakesh', 'nikhilr234@gmail.com')).toMatchObject({ slug: 'nikhil-rakesh', email: 'nikhilr234@gmail.com', status: 'draft' })
})

it('can preserve the cardholder name while using a separate unique URL seed', () => {
  expect(createDefaultProfileDraft('Nikhil Rakesh', 'owner+iq@example.com', 'owner+iq')).toMatchObject({
    full_name: 'Nikhil Rakesh',
    slug: 'owner-iq',
  })
})

it('uses a deterministic profile fallback when the URL seed is empty', () => {
  expect(createDefaultProfileDraft('', 'owner@example.com', '')).toMatchObject({ slug: 'profile' })
})

it('suffixes reserved roots when creating a default draft', () => {
  expect(createDefaultProfileDraft('Admin User', 'admin@example.com', 'admin')).toMatchObject({ slug: 'admin-2' })
})
