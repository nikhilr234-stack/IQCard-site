import { createAdminClient } from '@/lib/supabase/admin'
import { hashRegistrationToken } from './token'

export type RegistrationClaimStatus = 'claimed' | 'expired' | 'already-used' | 'email-mismatch' | 'missing'

export type RegistrationClaimResult = {
  status: RegistrationClaimStatus
  intentId: string | null
}

export interface RegistrationClaimStore {
  claim(input: { tokenHash: string; ownerId: string; email: string }): Promise<RegistrationClaimResult>
}

type RegistrationClaimAccount = {
  id: string
  email: string
}

const claimStatuses = new Set<RegistrationClaimStatus>([
  'claimed',
  'expired',
  'already-used',
  'email-mismatch',
  'missing',
])

function isClaimStatus(value: unknown): value is RegistrationClaimStatus {
  return typeof value === 'string' && claimStatuses.has(value as RegistrationClaimStatus)
}

function createAdminRegistrationClaimStore(): RegistrationClaimStore {
  return {
    async claim({ tokenHash, ownerId, email }) {
      const { data, error } = await createAdminClient().rpc('claim_registration_intent', {
        p_token_hash: tokenHash,
        p_owner_id: ownerId,
        p_email: email,
      })

      if (error) throw error
      const row = Array.isArray(data) ? data[0] : data
      return {
        status: row?.status,
        intentId: row?.intent_id ?? null,
      }
    },
  }
}

export async function claimRegistrationIntent(
  rawToken: string | null,
  account: RegistrationClaimAccount,
  dependencies: { store?: RegistrationClaimStore } = {},
): Promise<RegistrationClaimResult> {
  if (!rawToken || !account.id || !account.email) return { status: 'missing', intentId: null }

  try {
    const result = await (dependencies.store ?? createAdminRegistrationClaimStore()).claim({
      tokenHash: hashRegistrationToken(rawToken),
      ownerId: account.id,
      email: account.email.trim().toLowerCase(),
    })

    if (!isClaimStatus(result.status)) throw new Error('Unknown registration claim result')
    return { status: result.status, intentId: result.status === 'claimed' ? result.intentId : null }
  } catch {
    throw new Error('Unable to attach your saved registration')
  }
}
