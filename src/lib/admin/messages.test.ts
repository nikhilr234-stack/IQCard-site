import { describe, expect, it } from 'vitest'
import { adminActionMessage } from './messages'

describe('admin action messages', () => {
  it('explains known onboarding and resend failures', () => {
    expect(adminActionMessage('invalid-email')).toContain('valid email')
    expect(adminActionMessage('auth-lookup-failed')).toContain('accounts')
    expect(adminActionMessage('auth-lookup-limit')).toContain('accounts')
    expect(adminActionMessage('invite-failed')).toContain('access link')
    expect(adminActionMessage('account-failed')).toContain('account')
    expect(adminActionMessage('account-role-conflict')).toContain('administrator')
    expect(adminActionMessage('profile-failed')).toBe('The client profile could not be created. Please try again.')
    expect(adminActionMessage('client-not-found')).toContain('client')
  })

  it('returns no message for an unknown status', () => {
    expect(adminActionMessage('unknown')).toBeNull()
  })
})
