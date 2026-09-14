import { describe, expect, it } from 'vitest'
import { normalizeLegacyContact, parseVCard } from './legacy-profile'

describe('legacy VCF parsing', () => {
  it('parses escaped fields and normalizes email, phone, and URL values', () => {
    const result = parseVCard(`BEGIN:VCARD\nFN:Tejashree Pradhap\nTITLE:Urban Planner / Architect\nTEL;TYPE=CELL:+917259706185\nEMAIL:TEJU2344@GMAIL.COM\nURL:https://www.linkedin.com/in/tejashree-pradhap-843b01253/\nNOTE:Exploring cities\\; through design\nEND:VCARD`)

    expect(result).toEqual({
      fullName: 'Tejashree Pradhap',
      email: 'teju2344@gmail.com',
      phone: '+917259706185',
      headline: 'Urban Planner / Architect',
      bio: 'Exploring cities; through design',
      urls: [{ label: 'URL', url: 'https://www.linkedin.com/in/tejashree-pradhap-843b01253/' }],
    })
  })

  it('reports a missing email without inventing an owner', () => {
    const draft = normalizeLegacyContact(
      parseVCard('BEGIN:VCARD\nFN:Ashwin Reddy\nTEL:+919740909602\nEND:VCARD'),
      'ashwin',
    )

    expect(draft).toMatchObject({ email: null, sourceSlug: 'ashwin' })
  })

  it('normalizes a bare website domain to HTTPS', () => {
    const draft = normalizeLegacyContact(
      parseVCard('BEGIN:VCARD\nFN:Nikhil Rakesh\nEMAIL:nikhilr234@gmail.com\nURL:iqcard.in\nEND:VCARD'),
      'nikhil',
    )

    expect(draft).toMatchObject({ links: [{ label: 'URL', url: 'https://iqcard.in' }] })
  })
})
