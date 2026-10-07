import { describe, expect, it } from 'vitest'
import { parseRegistrationRequest, validateRegistrationRequest } from './validation'

const validRequest = {
  email: ' Owner@Example.com ',
  designId: 'IQD-ABC123',
  payload: {
    schemaVersion: '1.0',
    configuration: {
      core: 'black',
      material: 'Walnut',
      customColor: null,
      identity: {
        name: '  Sample   Person  ',
        tone: 'dark',
        composition: 'signature',
        fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
      },
      logo: { mode: 'iq', dataUrl: null, filename: null, mimeType: null, scale: 1, x: 0, y: 0, align: 'right' },
      backLayout: 'pure',
      craft: 'engrave',
    },
    pricing: { total: 1 },
    manufacturing: { surfaces: { front: { material: 'Forged' } } },
  },
}

const canonicalPayload = {
  schemaVersion: '1.0',
  configuration: {
    core: 'black',
    material: 'Walnut',
    customColor: null,
    identity: {
      name: 'Sample Person',
      tone: 'dark',
      composition: 'signature',
      fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
    },
    logo: { mode: 'iq', dataUrl: null, filename: null, mimeType: null, scale: 1, x: 0, y: 0, align: 'right' },
    backLayout: 'pure',
    craft: 'engrave',
  },
  pricing: {
    currency: 'INR',
    pricingVersion: 'flat-inr-v2',
    provisional: false,
    components: { base: 799, material: 0, craft: 0, customLogoSetup: 0 },
    total: 799,
  },
  manufacturing: {
    core: { color: 'black' },
    surfaces: {
      front: { material: 'Walnut', customColor: null },
      back: { material: 'Walnut', customColor: null },
    },
    identity: {
      name: 'Sample Person',
      fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
      logoMode: 'iq',
      logoPlacement: { scale: 1, x: 0, y: 0, align: 'right' },
      craft: 'engrave',
    },
    back: { layout: 'pure', backLayout: 'pure', tapToConnect: true },
  },
}

describe('registration request validation', () => {
  it('normalizes email and separates the validated cardholder name', () => {
    expect(parseRegistrationRequest(validRequest)).toEqual({
      email: 'owner@example.com',
      designId: 'IQD-ABC123',
      payload: canonicalPayload,
      firstName: 'Sample',
      lastName: 'Person',
    })
  })

  it.each([
    [{ ...validRequest, email: 'bad' }, 'email', 'invalid-email'],
    [{ ...validRequest, designId: 'bad-id' }, 'design', 'invalid-design'],
    [{ ...validRequest, payload: { ...validRequest.payload, configuration: { ...validRequest.payload.configuration, material: 'Copper' } } }, 'payload', 'invalid-payload'],
    [{ ...validRequest, payload: { schemaVersion: '1.0', configuration: { identity: { name: 'Sample Person' } } } }, 'payload', 'invalid-payload'],
  ])('returns a field-specific error for malformed input', (input, field, code) => {
    expect(validateRegistrationRequest(input)).toMatchObject({ ok: false, field, code })
    expect(parseRegistrationRequest(input)).toBeNull()
  })

  it('accepts an empty or single-word card identity', () => {
    for (const name of ['', 'YOUR NAME', 'Sample']) {
      const payload = {
        ...validRequest.payload,
        configuration: { ...validRequest.payload.configuration, identity: { ...validRequest.payload.configuration.identity, name } },
        manufacturing: { ...validRequest.payload.manufacturing, identity: { name } } as typeof validRequest.payload.manufacturing,
      }
      const result = parseRegistrationRequest({
        ...validRequest,
        payload,
      })
      expect(result).toMatchObject({ firstName: name === 'Sample' ? 'Sample' : name === 'YOUR NAME' ? 'YOUR' : '', lastName: name === 'YOUR NAME' ? 'NAME' : '' })
    }
  })

  it('rejects oversized design payloads', () => {
    const input = { ...validRequest, payload: { ...validRequest.payload, large: 'x'.repeat(2_000_001) } }
    expect(validateRegistrationRequest(input)).toMatchObject({ ok: false, field: 'payload', code: 'invalid-payload' })
  })
})
