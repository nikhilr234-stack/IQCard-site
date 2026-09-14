import { createHmac } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export interface RegistrationRateLimitStore {
  consume(input: { keyHash: string; windowSeconds: number; maximum: number }): Promise<boolean>
}

export function hashRateLimitKey(kind: 'email' | 'ip', value: string, secret: string): string {
  return createHmac('sha256', secret).update(`${kind}:${value.trim().toLowerCase()}`).digest('hex')
}

function createRateLimitStore(): RegistrationRateLimitStore {
  return {
    async consume({ keyHash, windowSeconds, maximum }) {
      const { data, error } = await createAdminClient().rpc('consume_registration_rate_limit', {
        p_key_hash: keyHash,
        p_window_seconds: windowSeconds,
        p_maximum: maximum,
      })
      if (error || typeof data !== 'boolean') throw error ?? new Error('Invalid rate-limit result')
      return data
    },
  }
}

export async function checkRegistrationRateLimit(
  input: { email: string; ip: string },
  dependencies: { store?: RegistrationRateLimitStore; secret?: string } = {},
): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const secret = dependencies.secret ?? process.env.IQCARD_RATE_LIMIT_SECRET?.trim()
  if (!secret) throw new Error('Registration rate limiting is not configured')
  const store = dependencies.store ?? createRateLimitStore()
  const emailAllowed = await store.consume({
    keyHash: hashRateLimitKey('email', input.email, secret), windowSeconds: 600, maximum: 5,
  })
  const ipAllowed = await store.consume({
    keyHash: hashRateLimitKey('ip', input.ip || input.email, secret), windowSeconds: 600, maximum: 20,
  })
  return emailAllowed && ipAllowed ? { allowed: true } : { allowed: false, retryAfterSeconds: 600 }
}
