import { describe, expect, it } from 'vitest'
import { calculateOrderPrice } from './pricing'

const card = {
  schemaVersion: '1.0',
  configuration: {
    material: 'Walnut', core: 'black', customColor: null, backLayout: 'pure', craft: 'engrave',
    identity: { name: 'Sample Customer', tone: 'dark', composition: 'signature', fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' } },
    logo: { mode: 'iq', dataUrl: null, filename: null, mimeType: null, scale: 1, x: 0, y: 0, align: 'left' },
  },
  pricing: { total: 1, currency: 'USD' },
}

describe('calculateOrderPrice', () => {
  it('uses the approved ₹799 card price and explicit server charges', () => {
    expect(calculateOrderPrice(card, { shippingPaise: 12_500, taxPaise: 0 })).toMatchObject({
      cardSubtotalPaise: 79_900,
      shippingPaise: 12_500,
      taxPaise: 0,
      totalPaise: 92_400,
      currency: 'INR',
      pricingVersion: 'flat-inr-v2',
    })
  })

  it.each([
    ['missing shipping', { taxPaise: 0 }],
    ['fractional shipping', { shippingPaise: 1.5, taxPaise: 0 }],
    ['negative shipping', { shippingPaise: -1, taxPaise: 0 }],
    ['unsafe tax', { shippingPaise: 0, taxPaise: Number.MAX_SAFE_INTEGER }],
  ])('rejects %s', (_label, charges) => {
    expect(calculateOrderPrice(card, charges as { shippingPaise: number; taxPaise: number })).toBeNull()
  })

  it('rejects an invalid saved-card payload', () => {
    expect(calculateOrderPrice({ ...card, schemaVersion: 'bad' }, { shippingPaise: 0, taxPaise: 0 })).toBeNull()
  })
})
