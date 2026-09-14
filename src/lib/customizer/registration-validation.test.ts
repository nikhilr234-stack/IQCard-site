import { describe, expect, it } from 'vitest'
// @ts-expect-error The browser validation module is served directly from public/.
import { handoffEmailError, identityNameError } from '../../../public/customize/registration-validation.mjs'

describe('customizer registration validation', () => {
  it('allows an optional identity with either one name or a full name', () => {
    expect(identityNameError('')).toBeNull()
    expect(identityNameError('YOUR NAME')).toBeNull()
    expect(identityNameError('Nikhil')).toBeNull()
    expect(identityNameError('Nikhil Rakesh')).toBeNull()
  })

  it('gives specific email guidance before requesting a sign-in link', () => {
    expect(handoffEmailError('')).toBe('Email address is required.')
    expect(handoffEmailError('nikhil@')).toBe('Enter a valid email address, for example name@example.com.')
    expect(handoffEmailError(' Nikhil@example.com ')).toBeNull()
  })
})
