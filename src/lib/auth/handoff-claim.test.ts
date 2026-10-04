import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const confirmRoutePath = resolve(process.cwd(), 'src/app/auth/confirm/route.ts')
const callbackRoutePath = resolve(process.cwd(), 'src/app/auth/callback/route.ts')
const claimPath = resolve(process.cwd(), 'src/lib/auth/handoff-claim.ts')

describe('authenticated checkout handoff claim', () => {
  it('ignores a missing token and delegates a real token to the repository', () => {
    const source = readFileSync(claimPath, 'utf8')
    expect(source).toContain("if (!token || !accountId) return null")
    expect(source).toContain('claimCheckoutHandoff(token, accountId)')
  })

  it('claims the handoff after the direct token-hash confirmation succeeds', () => {
    const source = readFileSync(confirmRoutePath, 'utf8')
    expect(source).toContain("searchParams.get('handoff')")
    expect(source).toContain("return redirectUrl.searchParams.get('handoff')")
    expect(source).toContain('claimHandoffAfterAuth(handoff, account.id)')
    expect(source).toContain('verifyOtp({ token_hash: tokenHash, type })')
  })

  it('claims the handoff after the fallback code exchange succeeds too', () => {
    const source = readFileSync(callbackRoutePath, 'utf8')
    expect(source).toContain("requestedParameter(request, 'handoff')")
    expect(source).toContain('claimHandoffAfterAuth(handoff, account.id)')
    expect(source).toContain('exchangeCodeForSession(code)')
  })
})
