import { describe, expect, it } from 'vitest'
import { normalizeLinks, validateLinks } from './links'

describe('profile links', () => {
  it('trims labels and URLs and drops completely empty rows', () => {
    expect(normalizeLinks([{ label: ' Website ', url: ' https://example.com ' }, { label: ' ', url: ' ' }])).toEqual([{ label: 'Website', url: 'https://example.com' }])
  })

  it('limits a profile to twelve links', () => {
    const links = Array.from({ length: 13 }, (_, index) => ({ label: `Link ${index}`, url: `https://example.com/${index}` }))
    expect(normalizeLinks(links)).toHaveLength(12)
    expect(validateLinks(links)).toBe('You can add up to 12 links.')
  })

  it('rejects unsafe URLs', () => {
    expect(validateLinks([{ label: 'Bad', url: 'javascript:alert(1)' }])).toBe('Use an HTTP(S) link or a contact link.')
  })

  it.each([
    'https://example.com?x=1',
    'https://example.com:443/path?x=1',
    'https://192.0.2.10:65535/path?x=1',
    'https://255.255.255.255:1',
    'https://a.example.com:65535/path',
    'http://example.com/path?x=1#section',
    'mailto:user@example.com?subject=Hello',
    'mailto:user%40example.com?subject=Hello%20there',
    'tel:+44 20 1234 5678',
  ])('accepts each database-supported link URL form: %s', (url) => {
    expect(validateLinks([{ label: 'Contact', url }])).toBeNull()
  })

  it.each([
    'https:///missing-host',
    'https://@missing-host',
    'https://example.com:invalid',
    'https://example.com:0',
    'https://example.com:65536',
    'https://[bad]:443',
    'https://[::::]:443',
    'https://[:::]:1',
    'https://[1:::2]:1',
    'https://%:1',
    'https://example..com',
    'https://example-.com',
    'https://example.-com',
    'https://999.999.999.999',
    'https://192.0.2.999',
    'https://example.com:/path',
    'http://',
    'mailto:not-an-email',
    'mailto:user@example.com%',
    'mailto:user@example.com%ZZ',
    'mailto:user@example.com%2',
    'https://192.168.001.001',
    'https://0177.0.0.1',
    'https://0',
    'javascript:alert(1)',
    'data:text/html,nope',
  ])('rejects malformed or non-allowlisted URL forms: %s', (url) => {
    expect(validateLinks([{ label: 'Contact', url }])).toBe('Use an HTTP(S) link or a contact link.')
  })

  it('rejects an overlong URL before it reaches the database boundary', () => {
    expect(validateLinks([{ label: 'Contact', url: `https://example.com/${'a'.repeat(2048)}` }])).toBe('Link URLs must be 2048 characters or fewer.')
  })
})
