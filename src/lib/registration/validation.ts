import { normalizeHandoffEmail } from '@/lib/checkout/handoff'
import { canonicalizeCardPayload } from '@/lib/customizer/card-configuration'
import type { RegistrationRequest, RegistrationValidationResult } from './types'

const DESIGN_ID_PATTERN = /^IQD-[A-Z0-9-]{4,80}$/i
const MAX_PAYLOAD_BYTES = 2_000_000

function invalid(
  field: 'email' | 'design' | 'name' | 'payload',
  code: 'invalid-email' | 'invalid-design' | 'invalid-name' | 'invalid-payload',
  message: string,
): RegistrationValidationResult {
  return { ok: false, field, code, message }
}

export function validateRegistrationRequest(value: unknown): RegistrationValidationResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return invalid('payload', 'invalid-payload', 'We could not read this card design. Please review it and try again.')
  }

  const candidate = value as { email?: unknown; designId?: unknown; payload?: unknown }
  const email = typeof candidate.email === 'string' ? normalizeHandoffEmail(candidate.email) : null
  if (!email) return invalid('email', 'invalid-email', 'Enter a valid email address, for example name@example.com.')

  const designId = typeof candidate.designId === 'string' ? candidate.designId.trim() : ''
  if (!DESIGN_ID_PATTERN.test(designId)) {
    return invalid('design', 'invalid-design', 'We could not identify this card design. Please review it and try again.')
  }

  if (!candidate.payload || typeof candidate.payload !== 'object' || Array.isArray(candidate.payload)) {
    return invalid('payload', 'invalid-payload', 'We could not read this card design. Please review it and try again.')
  }

  try {
    if (new TextEncoder().encode(JSON.stringify(candidate.payload)).byteLength > MAX_PAYLOAD_BYTES) {
      return invalid('payload', 'invalid-payload', 'This card design is too large to save. Remove the custom image and try again.')
    }
  } catch {
    return invalid('payload', 'invalid-payload', 'We could not read this card design. Please review it and try again.')
  }

  const payload = canonicalizeCardPayload(candidate.payload)
  if (!payload) {
    return invalid('payload', 'invalid-payload', 'We could not read this card design. Please review it and try again.')
  }

  const nameParts = payload.configuration.identity.name.split(/\s+/).filter(Boolean)

  return {
    ok: true,
    value: {
      email,
      designId,
      payload,
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' '),
    },
  }
}

export function parseRegistrationRequest(value: unknown): RegistrationRequest | null {
  const result = validateRegistrationRequest(value)
  return result.ok ? result.value : null
}
