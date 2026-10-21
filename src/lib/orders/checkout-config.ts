export type OrderCheckoutConfig = Readonly<{
  mode: 'test'
  keyId: string
  keySecret: string
  webhookSecret: string
  shippingPaise: number
  taxPaise: number
}>

export type OrderCheckoutAvailability =
  | { ready: true; config: OrderCheckoutConfig }
  | { ready: false; reason: 'disabled' | 'sandbox-only' | 'preview-only' | 'configuration' }

function paise(value: string | undefined): number | null {
  if (!value || !/^(0|[1-9]\d*)$/.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function isSandboxKey(value: string | undefined): value is string {
  return typeof value === 'string' && /^rzp_test_[A-Za-z0-9]+$/.test(value.trim())
}

export function getOrderCheckoutConfig(environment: Record<string, string | undefined> = process.env): OrderCheckoutAvailability {
  if (environment.IQCARD_COMMERCE_ENABLED !== 'true') return { ready: false, reason: 'disabled' }
  if (environment.VERCEL_ENV === 'production') return { ready: false, reason: 'preview-only' }
  if (environment.IQCARD_COMMERCE_MODE !== 'test' || !isSandboxKey(environment.RAZORPAY_KEY_ID)) {
    return { ready: false, reason: 'sandbox-only' }
  }
  const keySecret = environment.RAZORPAY_KEY_SECRET?.trim()
  const webhookSecret = environment.RAZORPAY_WEBHOOK_SECRET?.trim()
  const shippingPaise = paise(environment.IQCARD_SHIPPING_PAISE)
  const taxPaise = paise(environment.IQCARD_TAX_PAISE)
  if (!keySecret || !webhookSecret || shippingPaise === null || taxPaise === null || !Number.isSafeInteger(79_900 + shippingPaise + taxPaise)) {
    return { ready: false, reason: 'configuration' }
  }
  return { ready: true, config: {
    mode: 'test', keyId: environment.RAZORPAY_KEY_ID.trim(), keySecret, webhookSecret, shippingPaise, taxPaise,
  } }
}

export function isRazorpayWebhookAvailable(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.IQCARD_COMMERCE_MODE === 'test' && environment.VERCEL_ENV !== 'production' &&
    isSandboxKey(environment.RAZORPAY_KEY_ID) && Boolean(environment.RAZORPAY_KEY_SECRET?.trim()) &&
    Boolean(environment.RAZORPAY_WEBHOOK_SECRET?.trim())
}

export function getRazorpayWebhookSecret(environment: Record<string, string | undefined> = process.env): string | null {
  return isRazorpayWebhookAvailable(environment) ? environment.RAZORPAY_WEBHOOK_SECRET?.trim() ?? null : null
}
