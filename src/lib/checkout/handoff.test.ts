import { describe, expect, it } from 'vitest'
import { createHandoffToken, normalizeHandoffEmail, safeHandoffPayload } from './handoff'

describe('checkout handoff contracts', () => {
  it('normalizes valid email addresses and rejects invalid values', () => {
    expect(normalizeHandoffEmail('  NikhilR234@GMAIL.COM ')).toBe('nikhilr234@gmail.com')
    expect(normalizeHandoffEmail('')).toBeNull()
    expect(normalizeHandoffEmail('not-an-email')).toBeNull()
  })

  it('creates a cryptographically random token suitable for a magic-link query', () => {
    const first = createHandoffToken()
    const second = createHandoffToken()

    expect(first).toMatch(/^[a-f0-9-]{36}$/)
    expect(second).toMatch(/^[a-f0-9-]{36}$/)
    expect(first).not.toBe(second)
  })

  it('accepts a design id and object payload while rejecting malformed input', () => {
    expect(safeHandoffPayload({ designId: 'IQD-ABC123', payload: { configuration: { material: 'Walnut' } } })).toEqual({
      designId: 'IQD-ABC123',
      payload: { configuration: { material: 'Walnut' } },
    })
    expect(safeHandoffPayload({ designId: '', payload: {} })).toBeNull()
    expect(safeHandoffPayload({ designId: 'IQD-ABC123', payload: 'not-an-object' })).toBeNull()
  })
})
