import { describe, expect, it } from 'vitest'
import { magicLinkErrorMessage, magicLinkErrorReason } from './messages'

describe('magic-link error messages', () => {
  it('classifies Supabase rate limits separately', () => {
    expect(magicLinkErrorReason({ status: 429, message: 'Too many requests' })).toBe('rate-limited')
    expect(magicLinkErrorMessage('rate-limited')).toContain('wait a little')
  })

  it('explains when the project email service has not authorized the address', () => {
    expect(magicLinkErrorReason({ message: 'Email address not authorized' })).toBe('not-authorized')
    expect(magicLinkErrorMessage('not-authorized')).toContain('email service')
  })

  it('uses a neutral fallback for unexpected provider errors', () => {
    expect(magicLinkErrorReason({ message: 'Unexpected provider failure' })).toBe('failed')
    expect(magicLinkErrorMessage('failed')).toContain('try again')
  })
})
