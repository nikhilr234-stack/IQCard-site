import { createAdminClient } from '@/lib/supabase/admin'
import { createRegistrationToken, registrationIntentExpiryMinutes } from './token'

type ResendInput = { email: string; designId: string }
type ResendResult = { email: string; designId: string; expiresAt: string }

export interface RegistrationResendStore {
  rotateToken(input: { email: string; designId: string; tokenHash: string; expiresAt: string; now: string }): Promise<ResendResult | null>
}

function createStore(): RegistrationResendStore {
  return {
    async rotateToken(input) {
      const client = createAdminClient()
      const { data: pending, error: lookupError } = await client
        .from('registration_intents')
        .select('id,token_hash,email,design_id')
        .eq('email', input.email)
        .eq('design_id', input.designId)
        .eq('status', 'pending')
        .gt('expires_at', input.now)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lookupError) throw lookupError
      if (!pending) return null

      const { data, error } = await client.from('registration_intents')
        .update({ token_hash: input.tokenHash, expires_at: input.expiresAt })
        .eq('id', pending.id)
        .eq('token_hash', pending.token_hash)
        .eq('status', 'pending')
        .select('email,design_id')
        .maybeSingle()
      if (error) throw error
      if (!data) return null
      return { email: data.email, designId: data.design_id, expiresAt: input.expiresAt }
    },
  }
}

export async function resendRegistrationIntent(
  input: ResendInput,
  dependencies: { store?: RegistrationResendStore; now?: () => Date; createToken?: typeof createRegistrationToken } = {},
): Promise<{ token: string; email: string; designId: string } | null> {
  const now = (dependencies.now ?? (() => new Date()))()
  const token = (dependencies.createToken ?? createRegistrationToken)()
  const expiresAt = new Date(now.getTime() + registrationIntentExpiryMinutes * 60_000).toISOString()
  const updated = await (dependencies.store ?? createStore()).rotateToken({
    email: input.email,
    designId: input.designId,
    tokenHash: token.hash,
    expiresAt,
    now: now.toISOString(),
  })
  return updated ? { token: token.raw, email: updated.email, designId: updated.designId } : null
}
