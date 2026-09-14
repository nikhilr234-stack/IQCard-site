import { describe, expect, it } from 'vitest'
import { createRegistrationToken, hashRegistrationToken, registrationIntentExpiryMinutes } from './token'

describe('registration intent tokens', () => {
  it('hashes a raw token with deterministic SHA-256 output', () => {
    expect(hashRegistrationToken('raw-token')).toBe('34d328009b123fbbb0dc93f18b3e6de1ecf7b1a5783c33dff7ffe1926f09e943')
  })

  it('creates a random raw token and a separate storage hash', () => {
    const first = createRegistrationToken()
    const second = createRegistrationToken()

    expect(first.raw).toMatch(/^[a-f0-9-]{36}$/)
    expect(first.hash).toMatch(/^[a-f0-9]{64}$/)
    expect(first.hash).toBe(hashRegistrationToken(first.raw))
    expect(first.hash).not.toContain(first.raw)
    expect(second.raw).not.toBe(first.raw)
  })

  it('expires pending registration intents after thirty minutes', () => {
    expect(registrationIntentExpiryMinutes).toBe(30)
  })
})
