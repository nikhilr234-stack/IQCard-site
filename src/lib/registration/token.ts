import { createHash, randomUUID } from 'node:crypto'

export const registrationIntentExpiryMinutes = 30

export function hashRegistrationToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function createRegistrationToken(): { raw: string; hash: string } {
  const raw = randomUUID()
  return { raw, hash: hashRegistrationToken(raw) }
}
