export type OrderCheckoutConfig = Readonly<{
  mode: 'test' | 'live'
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

function configuredMode(environment: Record<string, string | undefined>): 'test' | 'live' | null {
  const mode = environment.IQCARD_COMMERCE_MODE
  const key = environment.RAZORPAY_KEY_ID?.trim() ?? ''
  if (mode === 'test' && environment.VERCEL_ENV !== 'production' && /^rzp_test_[A-Za-z0-9]+$/.test(key)) return 'test'
  if (mode === 'live' && environment.VERCEL_ENV === 'production' &&
    environment.IQCARD_LIVE_PAYMENTS_APPROVED === 'true' && /^rzp_live_[A-Za-z0-9]+$/.test(key)) return 'live'
  return null
}

export function getOrderCheckoutConfig(environment: Record<string, string | undefined> = process.env): OrderCheckoutAvailability {
  if (environment.IQCARD_COMMERCE_ENABLED !== 'true') return { ready: false, reason: 'disabled' }
  const mode = configuredMode(environment)
  if (!mode) return { ready: false, reason: environment.VERCEL_ENV === 'production' ? 'preview-only' : 'sandbox-only' }
  const keySecret = environment.RAZORPAY_KEY_SECRET?.trim()
  const webhookSecret = environment.RAZORPAY_WEBHOOK_SECRET?.trim()
  const shippingPaise = paise(environment.IQCARD_SHIPPING_PAISE)
  const taxPaise = paise(environment.IQCARD_TAX_PAISE)
  if (!keySecret || !webhookSecret || shippingPaise === null || taxPaise === null || !Number.isSafeInteger(79_900 + shippingPaise + taxPaise)) {
    return { ready: false, reason: 'configuration' }
  }
  return { ready: true, config: {
    mode, keyId: environment.RAZORPAY_KEY_ID!.trim(), keySecret, webhookSecret, shippingPaise, taxPaise,
  } }
}

export function isRazorpayWebhookAvailable(environment: Record<string, string | undefined> = process.env): boolean {
  // Disabling new checkout must not discard callbacks for money already captured.
  return configuredMode(environment) !== null && Boolean(environment.RAZORPAY_KEY_SECRET?.trim()) &&
    Boolean(environment.RAZORPAY_WEBHOOK_SECRET?.trim())
}

export function getRazorpayWebhookSecret(environment: Record<string, string | undefined> = process.env): string | null {
  return isRazorpayWebhookAvailable(environment) ? environment.RAZORPAY_WEBHOOK_SECRET?.trim() ?? null : null
}
