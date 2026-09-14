import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEmailOtpType } from './otp'

const confirmRoutePath = resolve(process.cwd(), 'src/app/auth/confirm/route.ts')

describe('email OTP callback', () => {
  it('accepts the email verification type', () => expect(parseEmailOtpType('email')).toBe('email'))
  it('rejects missing or unsupported types', () => {
    expect(parseEmailOtpType(null)).toBeNull()
    expect(parseEmailOtpType('magiclink')).toBeNull()
  })

  it('supports a server-side token-hash link that can finish in any browser', () => {
    const source = readFileSync(confirmRoutePath, 'utf8')
    expect(source).toContain('token_hash')
    expect(source).toContain('redirect_to')
    expect(source).toContain('supabase.auth.verifyOtp({ token_hash: tokenHash, type })')
  })
})
