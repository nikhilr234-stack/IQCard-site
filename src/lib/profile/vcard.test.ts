import { describe, expect, it } from 'vitest'
import { createVCard } from './vcard'

it('creates a contact card with name, phone, and email', () => {
  expect(createVCard({ fullName: 'Nikhil Rakesh', phone: '+918971572389', email: 'nikhilr234@gmail.com', headline: 'Architect' })).toContain('TEL;TYPE=CELL:+918971572389')
})
