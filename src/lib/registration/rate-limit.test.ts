import { describe, expect, it, vi } from 'vitest'
import { checkRegistrationRateLimit, hashRateLimitKey, type RegistrationRateLimitStore } from './rate-limit'

describe('registration rate limiting', () => {
  it('uses keyed hashes and never sends raw email or IP values to storage', async () => {
    const consume = vi.fn().mockResolvedValue(true)
    const store: RegistrationRateLimitStore = { consume }
    const result = await checkRegistrationRateLimit(
      { email: 'owner@example.com', ip: '203.0.113.8' },
      { store, secret: 'test-secret' },
    )

    expect(result).toEqual({ allowed: true })
    expect(consume).toHaveBeenCalledTimes(2)
    expect(JSON.stringify(consume.mock.calls)).not.toContain('owner@example.com')
    expect(JSON.stringify(consume.mock.calls)).not.toContain('203.0.113.8')
    expect(consume.mock.calls[0][0].keyHash).toBe(hashRateLimitKey('email', 'owner@example.com', 'test-secret'))
  })

  it('rejects the request when either durable limit is exhausted', async () => {
    const store: RegistrationRateLimitStore = { consume: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false) }
    await expect(checkRegistrationRateLimit(
      { email: 'owner@example.com', ip: '203.0.113.8' },
      { store, secret: 'test-secret' },
    )).resolves.toEqual({ allowed: false, retryAfterSeconds: 600 })
  })
})
