import { describe, expect, it, vi } from 'vitest'
import { resendRegistrationIntent } from './resend'

describe('resendRegistrationIntent', () => {
  it('rotates the token and expiry for the saved pending card without changing its design', async () => {
    const rotateToken = vi.fn().mockResolvedValue({
      email: 'owner@example.com', designId: 'IQD-ABC123', expiresAt: '2026-10-05T10:30:00.000Z',
    })
    const result = await resendRegistrationIntent({ email: 'owner@example.com', designId: 'IQD-ABC123' }, {
      now: () => new Date('2026-10-05T10:00:00.000Z'),
      createToken: () => ({ raw: 'fresh-secret', hash: 'fresh-hash' }),
      store: {
        rotateToken,
      },
    })

    expect(result).toEqual({ token: 'fresh-secret', email: 'owner@example.com', designId: 'IQD-ABC123' })
    expect(rotateToken).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: 'fresh-hash', designId: 'IQD-ABC123' }))
  })

  it('returns no resend target when the saved registration is unavailable', async () => {
    const result = await resendRegistrationIntent({ email: 'owner@example.com', designId: 'IQD-ABC123' }, {
      store: { rotateToken: vi.fn().mockResolvedValue(null) },
    })

    expect(result).toBeNull()
  })
})
