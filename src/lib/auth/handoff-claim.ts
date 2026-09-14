import { claimCheckoutHandoff } from '@/lib/checkout/repository'
import type { CheckoutHandoff } from '@/lib/checkout/repository'

export async function claimHandoffAfterAuth(token: string | null, accountId: string): Promise<CheckoutHandoff | null> {
  if (!token || !accountId) return null
  return claimCheckoutHandoff(token, accountId)
}
