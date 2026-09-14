import { isReservedSlug, suggestSlug } from '../profile/validation'

export function validateClientEmail(value: string): { ok: true; value: string } | { ok: false; error: string } {
  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'Enter a valid client email.' }
  return { ok: true, value: email }
}

export function makeAvailableSlug(base: string, taken: Set<string>) {
  const root = suggestSlug(base) || 'profile'
  if (!taken.has(root) && !isReservedSlug(root)) return root
  let suffix = 2
  while (taken.has(`${root}-${suffix}`)) suffix += 1
  return `${root}-${suffix}`
}
