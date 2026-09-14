import { describe, expect, it } from 'vitest'
import { canAccessRoute, destinationForRole, isAdminEmail, resolvePostLoginPath, roleForEmail, safeReturnPath } from './roles'

describe('role routing', () => {
  it('sends administrators to the admin portal', () => {
    expect(destinationForRole('admin')).toBe('/admin')
  })

  it('sends clients to their dashboard', () => {
    expect(destinationForRole('client')).toBe('/dashboard')
  })
})

describe('return path validation', () => {
  it('rejects external return URLs', () => {
    expect(safeReturnPath('https://evil.example')).toBeNull()
  })

  it('allows internal return URLs', () => {
    expect(safeReturnPath('/dashboard?welcome=1')).toBe('/dashboard?welcome=1')
  })

  it('rejects protocol-relative paths', () => {
    expect(safeReturnPath('//evil.example')).toBeNull()
  })

  it.each([
    '/%09/evil.example',
    '/\tevil.example',
    '/\revil.example',
    '/\nevil.example',
    '/\0evil.example',
    '/\\evil.example',
    '/%5cevil.example',
    '/%2f%2fevil.example',
    '/%252f%252fevil.example',
    '/%2525252f%2525252fevil.example',
    ' //evil.example',
    'https://evil.example/dashboard',
  ])('rejects obfuscated or non-relative return path %j', (candidate) => {
    expect(safeReturnPath(candidate)).toBeNull()
  })

  it('normalizes an allowed same-origin relative path', () => {
    expect(safeReturnPath('/dashboard/../dashboard?welcome=1#profile')).toBe('/dashboard?welcome=1#profile')
  })
})

describe('administrator lookup', () => {
  it('matches email addresses without case sensitivity', () => {
    expect(isAdminEmail('Admin@IQCard.in', new Set(['admin@iqcard.in']))).toBe(true)
  })

  it('does not treat an unlisted email as an administrator', () => {
    expect(isAdminEmail('guest@example.com', new Set(['admin@iqcard.in']))).toBe(false)
  })

  it('assigns the client role to an unlisted email', () => {
    expect(roleForEmail('guest@example.com', new Set(['admin@iqcard.in']))).toBe('client')
  })
})

describe('post-login routing', () => {
  it('uses the role destination when no safe next path is supplied', () => {
    expect(resolvePostLoginPath('client', null)).toBe('/dashboard')
  })

  it('uses an internal next path after sign-in', () => {
    expect(resolvePostLoginPath('client', '/dashboard?setup=1')).toBe('/dashboard?setup=1')
  })

  it('sends clients to their dashboard when the return path is the landing page', () => {
    expect(resolvePostLoginPath('client', '/')).toBe('/dashboard')
  })

  it('sends incomplete clients to their canonical onboarding step', () => {
    expect(resolvePostLoginPath('client', '/dashboard', 'content')).toBe('/onboarding/content')
  })

  it('sends completed clients to the dashboard', () => {
    expect(resolvePostLoginPath('client', null, null)).toBe('/dashboard')
  })

  it('does not apply client onboarding routing to administrators', () => {
    expect(resolvePostLoginPath('admin', null, 'identity')).toBe('/admin')
  })
})

describe('route access', () => {
  it('denies a client access to an admin-only route', () => {
    expect(canAccessRoute('client', '/admin')).toBe(false)
  })

  it('allows an admin access to the dashboard', () => {
    expect(canAccessRoute('admin', '/dashboard')).toBe(true)
  })
})
