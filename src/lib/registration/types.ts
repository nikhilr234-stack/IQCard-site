import type { CanonicalCardPayload } from '@/lib/customizer/card-configuration'

export type RegistrationIntentStatus = 'pending' | 'claimed' | 'expired' | 'cancelled'

export type RegistrationIntent = {
  id: string
  token_hash: string
  email: string
  design_id: string
  design_payload: Record<string, unknown>
  schema_version: number
  first_name: string
  last_name: string
  status: RegistrationIntentStatus
  owner_id: string | null
  created_at: string
  expires_at: string
  claimed_at: string | null
}

export type RegistrationRequest = {
  email: string
  designId: string
  payload: CanonicalCardPayload
  firstName: string
  lastName: string
}

export type RegistrationValidationError = {
  ok: false
  field: 'email' | 'design' | 'name' | 'payload'
  code: 'invalid-email' | 'invalid-design' | 'invalid-name' | 'invalid-payload'
  message: string
}

export type RegistrationValidationResult =
  | { ok: true; value: RegistrationRequest }
  | RegistrationValidationError
