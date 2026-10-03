import { describe, expect, it } from 'vitest'
// @ts-expect-error The browser validation module is served directly from public/.
import { handoffEmailError, identityNameError } from '../../../public/customize/registration-validation.mjs'

describe('customizer registration validation', () => {
  it('requires a real first and last name before the customer leaves identity setup', () => {
    expect(identityNameError('')).toBe('Enter your first and last name.')
    expect(identityNameError('YOUR NAME')).toBe('Enter your first and last name.')
    expect(identityNameError('Nikhil')).toBe('Enter your first and last name.')
    expect(identityNameError('Nikhil Rakesh')).toBeNull()
  })

  it('gives specific email guidance before requesting a sign-in link', () => {
    expect(handoffEmailError('')).toBe('Email address is required.')
    expect(handoffEmailError('nikhil@')).toBe('Enter a valid email address, for example name@example.com.')
    expect(handoffEmailError(' Nikhil@example.com ')).toBeNull()
  })
})
