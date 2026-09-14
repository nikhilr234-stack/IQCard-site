import { describe, expect, it } from 'vitest'
import { makeAvailableSlug, validateClientEmail } from './validation'

describe('admin onboarding validation', () => {
  it('normalizes a valid client email', () => expect(validateClientEmail('  client@example.com ')).toEqual({ ok: true, value: 'client@example.com' }))
  it('rejects malformed email addresses', () => expect(validateClientEmail('not-an-email')).toEqual({ ok: false, error: 'Enter a valid client email.' }))
  it('adds a suffix when a suggested slug is already taken', () => expect(makeAvailableSlug('nikhil-rakesh', new Set(['nikhil-rakesh']))).toBe('nikhil-rakesh-2'))
  it('treats reserved profile routes as taken when choosing an available slug', () => {
    expect(makeAvailableSlug('admin', new Set())).toBe('admin-2')
    expect(makeAvailableSlug('admin', new Set(['admin-2']))).toBe('admin-3')
  })
})
