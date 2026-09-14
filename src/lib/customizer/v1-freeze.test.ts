import { describe, expect, it } from 'vitest'
import { CARD_MATERIALS, canonicalizeCardPayload } from './card-configuration'

const v1Payload = (configuration: Record<string, unknown>) => ({
  schemaVersion: '1.0',
  configuration: {
    material: 'Walnut',
    identity: { name: 'Ada Lovelace', tone: 'dark', composition: 'signature' },
    backLayout: 'pure',
    ...configuration,
  },
})

describe('IQ Card V1 frozen product contract', () => {
  it('allows exactly the twelve approved surfaces', () => {
    expect(CARD_MATERIALS).toEqual([
      'White', 'Black', 'Graphite', 'Terracotta', 'Mustard', 'Oxblood',
      'Walnut', 'Natural Oak', 'Travertine', 'Concrete', 'Ivory Marble', 'Oxidised Steel',
    ])
  })

  it('accepts every approved material and rejects retired editions', () => {
    expect(canonicalizeCardPayload(v1Payload({ material: 'Leather' }))).toBeNull()
    expect(canonicalizeCardPayload(v1Payload({ material: 'Natural Oak' }))).not.toBeNull()
    expect(canonicalizeCardPayload(v1Payload({ material: 'Ivory Marble' }))).not.toBeNull()
    expect(canonicalizeCardPayload(v1Payload({ material: 'Oxidised Steel' }))).not.toBeNull()
  })

  it('serializes the approved configuration metadata', () => {
    const card = canonicalizeCardPayload(v1Payload({ material: 'Travertine' }))

    expect(card?.configuration.material).toBe('Travertine')
    expect(card?.manufacturing.surfaces.front.material).toBe('Travertine')
  })
})
