import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { RegistrationRequest } from './types'
import type { RegistrationIntent } from './types'
import { createRegistrationToken, registrationIntentExpiryMinutes } from './token'

export type RegistrationIntentInsert = {
  id: string
  token_hash: string
  email: string
  design_id: string
  design_payload: Record<string, unknown>
  schema_version: 1
  first_name: string
  last_name: string
  status: 'pending'
  expires_at: string
}

export interface RegistrationIntentStore {
  replace(input: RegistrationIntentInsert): Promise<void>
}

type RegistrationIntentDependencies = {
  store?: RegistrationIntentStore
  now?: () => Date
  createToken?: typeof createRegistrationToken
  createIntentId?: () => string
}

function createAdminRegistrationIntentStore(): RegistrationIntentStore {
  return {
    async replace(input) {
      const client = createAdminClient()
      const { error } = await client.rpc('replace_registration_intent', {
        p_id: input.id,
        p_token_hash: input.token_hash,
        p_email: input.email,
        p_design_id: input.design_id,
        p_design_payload: input.design_payload,
        p_schema_version: input.schema_version,
        p_first_name: input.first_name,
        p_last_name: input.last_name,
        p_expires_at: input.expires_at,
      })
      if (!error) return

      // Keep production handoff usable when the atomic helper migration has not
      // reached the linked Supabase project yet.
      const cancelled = await client
        .from('registration_intents')
        .update({ status: 'cancelled' })
        .eq('email', input.email)
        .eq('design_id', input.design_id)
        .eq('status', 'pending')
      if (cancelled.error) throw error
      const inserted = await client.from('registration_intents').insert(input)
      if (inserted.error) throw inserted.error
    },
  }
}

export async function createRegistrationIntent(
  input: RegistrationRequest,
  dependencies: RegistrationIntentDependencies = {},
): Promise<{ token: string; intentId: string }> {
  const store = dependencies.store ?? createAdminRegistrationIntentStore()
  const now = (dependencies.now ?? (() => new Date()))()
  const token = (dependencies.createToken ?? createRegistrationToken)()
  const intentId = (dependencies.createIntentId ?? randomUUID)()
  const expiresAt = new Date(now.getTime() + registrationIntentExpiryMinutes * 60 * 1000)

  try {
    await store.replace({
      id: intentId,
      token_hash: token.hash,
      email: input.email,
      design_id: input.designId,
      design_payload: input.payload,
      schema_version: 1,
      // The current production schema keeps these columns non-empty for account creation;
      // the card identity itself remains optional in the saved payload.
      first_name: input.firstName || 'Guest',
      last_name: input.lastName || 'User',
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
  } catch {
    throw new Error('Unable to save your registration')
  }

  return { token: token.raw, intentId }
}

export async function getLatestClaimedRegistrationIntent(ownerId: string): Promise<RegistrationIntent | null> {
  const { data, error } = await createAdminClient()
    .from('registration_intents')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('status', 'claimed')
    .order('claimed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error('Unable to load your saved registration')
  return data as RegistrationIntent | null
}
