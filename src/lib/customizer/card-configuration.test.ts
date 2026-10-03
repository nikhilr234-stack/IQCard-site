import { Buffer } from 'node:buffer'
import { describe, expect, it } from 'vitest'
import { canonicalizeCardPayload } from './card-configuration'

const basePayload = {
  schemaVersion: '1.0',
  configuration: {
    step: 'final',
    core: 'black',
    material: 'Walnut',
    customColor: null,
    finish: 'matte',
    identity: {
      name: '  Sample   Person  ',
      tone: 'dark',
      composition: 'signature',
      fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
    },
    logo: {
      mode: 'iq',
      dataUrl: null,
      objectUrl: 'blob:https://iqcard.in/session-only',
      filename: null,
      mimeType: null,
      scale: 1,
      x: 0,
      y: 0,
      align: 'right',
    },
    side: 'front',
    backLayout: 'pure',
    craft: 'engrave',
    injected: 'discard-me',
  },
  pricing: { total: 1, currency: 'BTC' },
  manufacturing: { surfaces: { front: { material: 'Forged' } } },
  assets: { uploadPath: '/admin/forged.svg' },
  createdAt: '1900-01-01T00:00:00.000Z',
  unknown: true,
}

function payloadWith(configuration: Record<string, unknown>) {
  return {
    ...basePayload,
    configuration: {
      ...basePayload.configuration,
      ...configuration,
    },
  }
}

describe('canonical card payload', () => {
  it('normalizes selections and rebuilds pricing and manufacturing without client-derived or unknown fields', () => {
    const result = canonicalizeCardPayload(basePayload)

    expect(result).toEqual({
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
        logo: {
          mode: 'iq',
          dataUrl: null,
          filename: null,
          mimeType: null,
          scale: 1,
          x: 0,
          y: 0,
          align: 'right',
        },
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
    })
    expect(result?.pricing.components.base).toBe(799)
    expect(result?.pricing.total).toBe(799)
    expect(result?.manufacturing.surfaces.front.material).toBe(result?.configuration.material)
  })

  it.each([
    'White', 'Black', 'Graphite', 'Terracotta', 'Mustard', 'Oxblood', 'Walnut',
    'Natural Oak', 'Travertine', 'Concrete', 'Ivory Marble', 'Oxidised Steel',
  ])('accepts material %s and keeps the flat server price', (material) => {
    const result = canonicalizeCardPayload(payloadWith({ material }))

    expect(result?.configuration.material).toBe(material)
    expect(result?.pricing).toMatchObject({ components: { base: 799, material: 0, craft: 0, customLogoSetup: 0 }, total: 799 })
  })

  it.each([
    'printed', 'engrave', 'emboss', 'deboss', 'foil',
  ])('accepts craft %s and keeps the flat server price', (craft) => {
    const result = canonicalizeCardPayload(payloadWith({ craft }))

    expect(result?.configuration.craft).toBe(craft)
    expect(result?.pricing).toMatchObject({ components: { base: 799, material: 0, craft: 0, customLogoSetup: 0 }, total: 799 })
  })

  it.each(['black', 'white'])('accepts the %s core', (core) => {
    expect(canonicalizeCardPayload(payloadWith({ core }))?.configuration.core).toBe(core)
  })

  it.each([
    ['black', 'dark'],
    ['white', 'light'],
  ])('derives %s core lettering as %s regardless of client tone', (core, tone) => {
    const identity = { ...basePayload.configuration.identity, tone: tone === 'dark' ? 'light' : 'dark' }
    expect(canonicalizeCardPayload(payloadWith({ core, identity }))?.configuration.identity.tone).toBe(tone)
  })

  it.each(['pure', 'branded', 'identity', 'custom'])('accepts the %s back layout', (backLayout) => {
    const result = canonicalizeCardPayload(payloadWith({ backLayout }))

    expect(result?.configuration.backLayout).toBe(backLayout)
    expect(result?.manufacturing.back.layout).toBe(backLayout)
  })

  it.each([['black', 'dark'], ['white', 'light']])('accepts valid %s-core identity metadata and derives %s tone', (core, tone) => {
    const identity = { ...basePayload.configuration.identity, tone }
    expect(canonicalizeCardPayload(payloadWith({ core, identity }))?.configuration.identity.tone).toBe(tone)
  })

  it.each(['signature', 'editorial', 'minimal', 'centered', 'statement'])('accepts the %s composition', (composition) => {
    const identity = { ...basePayload.configuration.identity, composition }
    expect(canonicalizeCardPayload(payloadWith({ identity }))?.configuration.identity.composition).toBe(composition)
  })

  it.each(['left', 'center', 'right'])('accepts %s alignment for names and logos', (align) => {
    const identity = {
      ...basePayload.configuration.identity,
      fineTune: { ...basePayload.configuration.identity.fineTune, align },
    }
    const logo = { ...basePayload.configuration.logo, align }
    const result = canonicalizeCardPayload(payloadWith({ identity, logo }))

    expect(result?.configuration.identity.fineTune.align).toBe(align)
    expect(result?.configuration.logo.align).toBe(align)
  })

  it.each([
    ['black', '#111214'],
    ['white', '#f8f8f5'],
    ['gray', '#8a8f98'],
    ['silver', '#c8cbd0'],
    ['red', '#d63447'],
    ['blue', '#3f72d8'],
  ])('accepts custom color %s and derives its manufacturing hex', (customColor, expectedHex) => {
    const result = canonicalizeCardPayload(payloadWith({ customColor }))

    expect(result?.configuration.customColor).toBe(customColor)
    expect(result?.manufacturing.surfaces.front.customColor).toBe(expectedHex)
    expect(result?.manufacturing.surfaces.back.customColor).toBe(expectedHex)
  })

  it('accepts the exact numeric placement bounds', () => {
    const identity = {
      ...basePayload.configuration.identity,
      fineTune: { nameScale: 0.5, x: -50, y: 40, align: 'right' },
    }
    const logo = { ...basePayload.configuration.logo, scale: 2, x: 50, y: -40, align: 'left' }
    const result = canonicalizeCardPayload(payloadWith({ identity, logo }))

    expect(result?.configuration.identity.fineTune).toEqual({ nameScale: 0.5, x: -50, y: 40, align: 'right' })
    expect(result?.configuration.logo).toMatchObject({ scale: 2, x: 50, y: -40, align: 'left' })
  })

  it.each([
    ['logo scale', { logo: { ...basePayload.configuration.logo, scale: 2.01 } }],
    ['logo x', { logo: { ...basePayload.configuration.logo, x: -51 } }],
    ['logo y', { logo: { ...basePayload.configuration.logo, y: 41 } }],
    ['name scale', { identity: { ...basePayload.configuration.identity, fineTune: { nameScale: 0.49, x: 0, y: 0, align: 'left' } } }],
    ['name x', { identity: { ...basePayload.configuration.identity, fineTune: { nameScale: 1, x: 51, y: 0, align: 'left' } } }],
    ['name y', { identity: { ...basePayload.configuration.identity, fineTune: { nameScale: 1, x: 0, y: -41, align: 'left' } } }],
  ])('rejects out-of-range %s values', (_label, patch) => {
    expect(canonicalizeCardPayload(payloadWith(patch))).toBeNull()
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])('rejects non-finite placement %s', (scale) => {
    const logo = { ...basePayload.configuration.logo, scale }
    expect(canonicalizeCardPayload(payloadWith({ logo }))).toBeNull()
  })

  it('accepts the compatible payload version and rejects unsupported versions', () => {
    expect(canonicalizeCardPayload(basePayload)?.schemaVersion).toBe('1.0')
    expect(canonicalizeCardPayload({ ...basePayload, schemaVersion: '2.0' })).toBeNull()
    expect(canonicalizeCardPayload({ ...basePayload, schemaVersion: 1 })).toBeNull()
  })

  it.each([
    ['material', { material: 'Copper' }],
    ['core', { core: 'clear' }],
    ['craft', { craft: 'laser' }],
    ['custom color', { customColor: '#111214' }],
    ['back layout', { backLayout: 'secret' }],
    ['identity tone', { identity: { ...basePayload.configuration.identity, tone: 'gold' } }],
    ['composition', { identity: { ...basePayload.configuration.identity, composition: 'stacked' } }],
    ['name alignment', { identity: { ...basePayload.configuration.identity, fineTune: { ...basePayload.configuration.identity.fineTune, align: 'justify' } } }],
    ['logo mode', { logo: { ...basePayload.configuration.logo, mode: 'remote' } }],
    ['logo alignment', { logo: { ...basePayload.configuration.logo, align: 'justify' } }],
  ])('rejects an unsupported %s', (_label, patch) => {
    expect(canonicalizeCardPayload(payloadWith(patch))).toBeNull()
  })

  it('accepts only a supported bounded custom-logo data URL and derives its MIME type', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8='
    const logo = {
      ...basePayload.configuration.logo,
      mode: 'custom',
      dataUrl,
      filename: '  mark.png  ',
      mimeType: 'image/not-authoritative',
    }
    const result = canonicalizeCardPayload(payloadWith({ logo }))

    expect(result?.configuration.logo).toMatchObject({
      mode: 'custom',
      dataUrl,
      filename: 'mark.png',
      mimeType: 'image/png',
    })
    expect(result?.pricing.components.customLogoSetup).toBe(0)
    expect(result?.pricing.total).toBe(799)
  })

  it.each([
    ['metadata without image data', { dataUrl: null, filename: 'mark.png', mimeType: 'image/png' }],
    ['unsupported image MIME', { dataUrl: 'data:image/gif;base64,aGVsbG8=', filename: 'mark.gif', mimeType: 'image/gif' }],
    ['non-base64 image data', { dataUrl: 'data:image/png,hello', filename: 'mark.png', mimeType: 'image/png' }],
  ])('rejects custom-logo %s', (_label, fields) => {
    const logo = { ...basePayload.configuration.logo, mode: 'custom', ...fields }
    expect(canonicalizeCardPayload(payloadWith({ logo }))).toBeNull()
  })

  it('accepts a one-megabyte custom logo and rejects a larger one', () => {
    const atLimit = `data:image/webp;base64,${Buffer.alloc(1_000_000).toString('base64')}`
    const overLimit = `data:image/webp;base64,${Buffer.alloc(1_000_001).toString('base64')}`
    const logo = { ...basePayload.configuration.logo, mode: 'custom', filename: 'mark.webp', mimeType: 'image/webp' }

    expect(canonicalizeCardPayload(payloadWith({ logo: { ...logo, dataUrl: atLimit } }))).not.toBeNull()
    expect(canonicalizeCardPayload(payloadWith({ logo: { ...logo, dataUrl: overLimit } }))).toBeNull()
  })

  it('marks the approved flat INR V2 price as non-provisional', () => {
    expect(canonicalizeCardPayload(basePayload)?.pricing).toMatchObject({
      currency: 'INR',
      pricingVersion: 'flat-inr-v2',
      provisional: false,
      total: 799,
    })
  })
})
