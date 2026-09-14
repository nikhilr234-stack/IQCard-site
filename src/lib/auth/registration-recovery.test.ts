import { describe, expect, it } from 'vitest'
import { registrationRecoveryContent } from './registration-recovery'

describe('registration recovery content', () => {
  it('gives expired registrations a clear restart path', () => {
    expect(registrationRecoveryContent('registration-expired')).toMatchObject({
      title: 'Your registration link expired.',
      actionHref: '/customize',
      actionLabel: 'Return to your saved card',
    })
  })

  it('explains email mismatch without revealing either address', () => {
    const content = registrationRecoveryContent('registration-email-mismatch')
    if (!content) throw new Error('Expected registration recovery content')
    expect(content.title).toBe('This link belongs to a different sign-in email.')
    expect(JSON.stringify(content)).not.toContain('@')
  })
})
