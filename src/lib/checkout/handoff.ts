import { randomUUID } from 'node:crypto'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DESIGN_ID_PATTERN = /^IQD-[A-Z0-9-]{4,80}$/i
const MAX_PAYLOAD_BYTES = 2_000_000

export function normalizeHandoffEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  return normalized && EMAIL_PATTERN.test(normalized) ? normalized : null
}

export function createHandoffToken(): string {
  return randomUUID()
}

export function safeHandoffPayload(value: unknown): { designId: string; payload: Record<string, unknown> } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null

  const candidate = value as { designId?: unknown; payload?: unknown }
  if (typeof candidate.designId !== 'string' || !DESIGN_ID_PATTERN.test(candidate.designId.trim())) return null
  if (!candidate.payload || typeof candidate.payload !== 'object' || Array.isArray(candidate.payload)) return null

  try {
    const serialized = JSON.stringify(candidate.payload)
    if (serialized.length > MAX_PAYLOAD_BYTES) return null
  } catch {
    return null
  }

  return { designId: candidate.designId.trim(), payload: candidate.payload as Record<string, unknown> }
}

export const checkoutHandoffExpiryMinutes = 30
