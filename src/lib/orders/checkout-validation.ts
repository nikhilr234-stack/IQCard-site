export type ValidOrderCheckoutRequest = Readonly<{
  requestKey: string
  designId: string
  phone: string
  shippingAddress: Readonly<{
    recipientName: string
    line1: string
    line2: string
    locality: string
    city: string
    state: string
    postalCode: string
    country: 'IN'
  }>
}>

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
}

function requiredText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > 0 && normalized.length <= max ? normalized : null
}

export function validateOrderCheckoutRequest(value: unknown):
  | { ok: true; value: ValidOrderCheckoutRequest }
  | { ok: false; field: string; code: string; message: string } {
  const fail = (field: string): { ok: false; field: string; code: string; message: string } => ({
    ok: false, field, code: 'invalid-checkout', message: `Review the ${field === 'shippingAddress' ? 'delivery address' : field} and try again.`,
  })
  const input = object(value)
  if (!input) return fail('payload')
  const requestKey = typeof input.requestKey === 'string' ? input.requestKey.toLowerCase() : ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestKey)) return fail('requestKey')
  const designId = requiredText(input.designId, 40)
  if (!designId || !/^IQD-[A-Za-z0-9]{6,32}$/.test(designId)) return fail('designId')
  if (typeof input.phone !== 'string') return fail('phone')
  let digits = input.phone.replace(/\D/g, '')
  if (digits.startsWith('0091')) digits = digits.slice(4)
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2)
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1)
  if (!/^[6-9]\d{9}$/.test(digits)) return fail('phone')
  const address = object(input.shippingAddress)
  if (!address || address.country !== 'IN') return fail('shippingAddress')
  const recipientName = requiredText(address.recipientName, 120)
  const line1 = requiredText(address.line1, 180)
  const line2 = address.line2 === undefined || address.line2 === '' ? '' : requiredText(address.line2, 180)
  const locality = requiredText(address.locality, 120)
  const city = requiredText(address.city, 120)
  const state = requiredText(address.state, 120)
  const postalCode = typeof address.postalCode === 'string' ? address.postalCode.trim() : ''
  if (!recipientName || !line1 || line2 === null || !locality || !city || !state || !/^[1-9]\d{5}$/.test(postalCode)) return fail('shippingAddress')
  return {
    ok: true,
    value: {
      requestKey, designId, phone: `+91${digits}`,
      shippingAddress: { recipientName, line1, line2, locality, city, state, postalCode, country: 'IN' },
    },
  }
}
