import { describe, expect, it } from 'vitest'
import { getPublicEnv, parseAdminEmails } from './env'

describe('environment configuration', () => {
  it('normalizes comma-separated administrator emails', () => {
    expect(parseAdminEmails(' Admin@IQCard.in,second@iqcard.in ')).toEqual(
      new Set(['admin@iqcard.in', 'second@iqcard.in']),
    )
  })

  it('rejects an empty public site URL', () => {
    expect(() => getPublicEnv({ NEXT_PUBLIC_SITE_URL: '' })).toThrow('NEXT_PUBLIC_SITE_URL')
  })
})
