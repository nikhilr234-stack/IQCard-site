import { describe, expect, it, vi } from 'vitest'
import { claimRegistrationIntent, type RegistrationClaimStore } from './claim'
import { hashRegistrationToken } from './token'

function storeReturning(status: string, intentId: string | null = null): RegistrationClaimStore & { claim: ReturnType<typeof vi.fn> } {
  return {
    claim: vi.fn().mockResolvedValue({ status, intentId }),
  }
}

const account = { id: 'owner-1', email: 'Owner@Example.com' }

describe('registration intent claim', () => {
  it('hashes the raw token and claims it for the verified account identity', async () => {
    const store = storeReturning('claimed', 'intent-1')

    await expect(claimRegistrationIntent('raw-token', account, { store })).resolves.toEqual({
      status: 'claimed',
      intentId: 'intent-1',
    })
    expect(store.claim).toHaveBeenCalledWith({
      tokenHash: hashRegistrationToken('raw-token'),
      ownerId: 'owner-1',
      email: 'owner@example.com',
    })
  })

  it.each(['expired', 'already-used', 'email-mismatch', 'missing'] as const)(
    'preserves the safe %s result returned by the atomic database function',
    async (status) => {
      const store = storeReturning(status)
      await expect(claimRegistrationIntent('raw-token', account, { store })).resolves.toEqual({
        status,
        intentId: null,
      })
    },
  )

  it('does not call the database for a missing token or account identity', async () => {
    const store = storeReturning('claimed', 'intent-1')

    await expect(claimRegistrationIntent(null, account, { store })).resolves.toEqual({ status: 'missing', intentId: null })
    await expect(claimRegistrationIntent('raw-token', { id: '', email: '' }, { store })).resolves.toEqual({ status: 'missing', intentId: null })
    expect(store.claim).not.toHaveBeenCalled()
  })

  it('fails closed when the database returns an unknown outcome', async () => {
    const store = storeReturning('surprise')
    await expect(claimRegistrationIntent('raw-token', account, { store })).rejects.toThrow('Unable to attach your saved registration')
  })
})
