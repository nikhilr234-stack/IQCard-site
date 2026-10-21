import { describe, expect, it } from 'vitest'
import { getOrderCheckoutConfig, isRazorpayWebhookAvailable } from './checkout-config'

const sandbox = {
  IQCARD_COMMERCE_ENABLED: 'true',
  IQCARD_COMMERCE_MODE: 'test',
  RAZORPAY_KEY_ID: 'rzp_test_public',
  RAZORPAY_KEY_SECRET: 'secret',
  RAZORPAY_WEBHOOK_SECRET: 'webhook-secret',
  IQCARD_SHIPPING_PAISE: '12500',
  IQCARD_TAX_PAISE: '0',
  VERCEL_ENV: 'preview',
}

describe('paid checkout configuration', () => {
  it('is disabled unless explicitly configured', () => {
    expect(getOrderCheckoutConfig({})).toMatchObject({ ready: false, reason: 'disabled' })
  })

  it('accepts an explicit sandbox configuration outside production', () => {
    expect(getOrderCheckoutConfig(sandbox)).toMatchObject({
      ready: true,
      config: { mode: 'test', keyId: 'rzp_test_public', shippingPaise: 12_500, taxPaise: 0 },
    })
  })

  it.each([
    ['live mode', { ...sandbox, IQCARD_COMMERCE_MODE: 'live' }],
    ['live key', { ...sandbox, RAZORPAY_KEY_ID: 'rzp_live_secret' }],
    ['production deployment', { ...sandbox, VERCEL_ENV: 'production' }],
    ['missing tax', { ...sandbox, IQCARD_TAX_PAISE: undefined }],
    ['fractional shipping', { ...sandbox, IQCARD_SHIPPING_PAISE: '12.5' }],
    ['unsafe total', { ...sandbox, IQCARD_SHIPPING_PAISE: '9007199254740991' }],
  ])('refuses %s', (_label, environment) => {
    expect(getOrderCheckoutConfig(environment)).toMatchObject({ ready: false })
  })

  it('allows already-configured sandbox webhook callbacks even when checkout is disabled', () => {
    expect(isRazorpayWebhookAvailable({
      ...sandbox,
      IQCARD_COMMERCE_ENABLED: undefined,
    })).toBe(true)
  })

  it('does not accept a production webhook configuration', () => {
    expect(isRazorpayWebhookAvailable({ ...sandbox, VERCEL_ENV: 'production' })).toBe(false)
  })
})
