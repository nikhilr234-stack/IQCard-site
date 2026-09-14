import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const authActionPath = resolve(process.cwd(), 'src/app/actions/auth.ts')
const authErrorPagePath = resolve(process.cwd(), 'src/app/auth/auth-code-error/page.tsx')

describe('cross-browser magic-link authentication', () => {
  it('sends new magic links to the server-side token confirmation route', () => {
    const source = readFileSync(authActionPath, 'utf8')

    expect(source).toContain("new URL('/auth/confirm', environment.siteUrl)")
    expect(source).toContain('emailRedirectTo: callbackUrl.toString()')
    expect(source).not.toContain('export async function verifyMagicCode')
  })

  it('does not require a six-digit code when a link cannot be completed', () => {
    const source = readFileSync(authErrorPagePath, 'utf8')

    expect(source).toContain("params.reason === 'invalid-link'")
    expect(source).toContain('Request a new sign-in email')
    expect(source).not.toContain('name="token"')
    expect(source).not.toContain('six-digit code')
  })
})
