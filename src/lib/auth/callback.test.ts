import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildAuthCallbackPage, callbackErrorReason } from './callback'

const callbackRoutePath = resolve(process.cwd(), 'src/app/auth/callback/route.ts')

describe('auth callback confirmation page', () => {
  it('defers exchanging the one-time code until the user submits the form', () => {
    const html = buildAuthCallbackPage('code-123', '/dashboard')

    expect(html).toContain('<form method="post" action="/auth/callback">')
    expect(html).toContain('name="code" value="code-123"')
    expect(html).toContain('name="next" value="/dashboard"')
    expect(html).toContain('Continue to IQ')
    expect(html).toContain('WELCOME BACK')
    expect(html).toContain('status-chip')
    expect(html).toContain('class="visual"')
    expect(html).not.toContain('exchangeCodeForSession')
  })

  it('uses the light IQ Card shell for the confirmation screen', () => {
    const html = buildAuthCallbackPage('code-123', null)

    expect(html).toContain('<header class="nav">')
    expect(html).toContain('href="/" aria-label="IQ Card home"')
    expect(html).toContain('Your identity is ready to continue.')
    expect(html).toContain('WALNUT · MATTE')
    expect(html).not.toContain('background: #0b0b0b')
  })

  it('escapes callback values before placing them in HTML', () => {
    const html = buildAuthCallbackPage('code"<script>', '/dashboard?x=1&y=2')

    expect(html).not.toContain('code"<script>')
    expect(html).toContain('code&quot;&lt;script&gt;')
    expect(html).toContain('/dashboard?x=1&amp;y=2')
  })

  it('does not carry an unsafe return path into the callback form', () => {
    const html = buildAuthCallbackPage('code-123', '/%2f%2fevil.example')

    expect(html).not.toContain('name="next"')
    expect(html).not.toContain('evil.example')
  })

  it('identifies a missing PKCE verifier as a browser mismatch', () => {
    expect(callbackErrorReason({ code: 'pkce_code_verifier_not_found' })).toBe('browser-mismatch')
    expect(callbackErrorReason({ code: 'otp_expired' })).toBe('invalid-link')
  })

  it('exchanges a clicked magic-link code and redirects to the Home Dashboard', () => {
    const source = readFileSync(callbackRoutePath, 'utf8')
    expect(source).toContain('supabase.auth.exchangeCodeForSession(code)')
    expect(source).toContain('NextResponse.redirect(new URL(resolvePostLoginPath(account.role, next), request.url), 303)')
    expect(source).not.toContain('buildAuthCallbackPage(code, next)')
  })

  it('preserves the requested destination when a link is opened in another browser', () => {
    const source = readFileSync(callbackRoutePath, 'utf8')
    expect(source).toContain("if (next) errorUrl.searchParams.set('next', next)")
    expect(source).toContain("reason', callbackErrorReason(error)")
  })
})
