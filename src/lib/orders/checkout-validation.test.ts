import { describe, expect, it } from 'vitest'
import { validateOrderCheckoutRequest } from './checkout-validation'

const request = {
  requestKey: '7e57d004-2b97-4e7d-8c1d-7f3d4f8e2d10',
  designId: 'IQD-ABC123',
  phone: '9000000000',
  shippingAddress: {
    recipientName: 'Sample Customer', line1: '1 Test Street', line2: '',
    locality: 'Test Locality', city: 'Test City', state: 'Test State', postalCode: '123456', country: 'IN',
  },
  amountPaise: 1,
  email: 'attacker@example.com',
}

describe('validateOrderCheckoutRequest', () => {
  it('normalizes contact/address data and ignores browser-supplied amount and email', () => {
    expect(validateOrderCheckoutRequest(request)).toEqual({
      ok: true,
      value: {
        requestKey: request.requestKey,
        designId: 'IQD-ABC123',
        phone: '+919000000000',
        shippingAddress: request.shippingAddress,
      },
    })
  })

  it('rejects incomplete or out-of-scope delivery addresses', () => {
    expect(validateOrderCheckoutRequest({ ...request, shippingAddress: { ...request.shippingAddress, postalCode: '1234' } }).ok).toBe(false)
    expect(validateOrderCheckoutRequest({ ...request, shippingAddress: { ...request.shippingAddress, country: 'US' } }).ok).toBe(false)
  })

  it('rejects malformed request keys and design identifiers', () => {
    expect(validateOrderCheckoutRequest({ ...request, requestKey: 'guessable' }).ok).toBe(false)
    expect(validateOrderCheckoutRequest({ ...request, designId: '../other-user' }).ok).toBe(false)
  })
})
