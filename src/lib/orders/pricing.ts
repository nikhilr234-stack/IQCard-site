export type ServerOrderPrice = Readonly<{
  cardSubtotalPaise: number
  shippingPaise: number
  taxPaise: number
  totalPaise: number
  currency: 'INR'
  pricingVersion: 'flat-inr-v2'
}>

export function calculateOrderPrice(
  savedCard: unknown,
  charges: { shippingPaise: number; taxPaise: number },
): (ServerOrderPrice & { cardSnapshot: Record<string, unknown> }) | null {
  const cardSnapshot = canonicalizeCardPayload(savedCard)
  if (!cardSnapshot || !Number.isSafeInteger(charges?.shippingPaise) || charges.shippingPaise < 0 ||
    !Number.isSafeInteger(charges?.taxPaise) || charges.taxPaise < 0) return null
  const cardSubtotalPaise = 79_900
  const totalPaise = cardSubtotalPaise + charges.shippingPaise + charges.taxPaise
  if (!Number.isSafeInteger(totalPaise)) return null
  return {
    cardSubtotalPaise,
    shippingPaise: charges.shippingPaise,
    taxPaise: charges.taxPaise,
    totalPaise,
    currency: 'INR',
    pricingVersion: 'flat-inr-v2',
    cardSnapshot,
  }
}
import { canonicalizeCardPayload } from '@/lib/customizer/card-configuration'
