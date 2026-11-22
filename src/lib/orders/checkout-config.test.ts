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

const production = {
  ...sandbox,
  VERCEL_ENV: 'production',
  IQCARD_COMMERCE_MODE: 'live',
  IQCARD_LIVE_PAYMENTS_APPROVED: 'true',
  RAZORPAY_KEY_ID: 'rzp_live_public',
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

  it('accepts explicitly approved live checkout only in production', () => {
    expect(getOrderCheckoutConfig(production)).toMatchObject({ ready: true, config: { mode: 'live', keyId: 'rzp_live_public' } })
    expect(isRazorpayWebhookAvailable(production)).toBe(true)
  })

  it.each([
    ['missing approval', { ...production, IQCARD_LIVE_PAYMENTS_APPROVED: undefined }],
    ['false approval', { ...production, IQCARD_LIVE_PAYMENTS_APPROVED: 'false' }],
    ['preview', { ...production, VERCEL_ENV: 'preview' }],
    ['local', { ...production, VERCEL_ENV: undefined }],
    ['test key', { ...production, RAZORPAY_KEY_ID: sandbox.RAZORPAY_KEY_ID }],
    ['missing key secret', { ...production, RAZORPAY_KEY_SECRET: '' }],
    ['missing webhook secret', { ...production, RAZORPAY_WEBHOOK_SECRET: '' }],
  ])('rejects live checkout and callbacks with %s', (_label, environment) => {
    expect(getOrderCheckoutConfig(environment)).toMatchObject({ ready: false })
    expect(isRazorpayWebhookAvailable(environment)).toBe(false)
  })

  it('keeps live callbacks available when new purchases are disabled', () => {
    const paused = { ...production, IQCARD_COMMERCE_ENABLED: 'false' }
    expect(getOrderCheckoutConfig(paused)).toMatchObject({ ready: false, reason: 'disabled' })
    expect(isRazorpayWebhookAvailable(paused)).toBe(true)
  })
})
