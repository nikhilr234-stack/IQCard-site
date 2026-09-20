import { describe, expect, it, vi } from 'vitest'
import type { CanonicalCardPayload } from '@/lib/customizer/card-configuration'
import { createRegistrationIntent, type RegistrationIntentStore } from './repository'

const payload = {
  schemaVersion: '1.0',
  configuration: {
    core: 'black',
    material: 'Walnut',
    customColor: null,
    identity: {
      name: 'Nikhil Rakesh',
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
    pricingVersion: 'demo-inr-v1',
    provisional: true,
    components: { base: 799, material: 500, craft: 350, customLogoSetup: 0 },
    total: 1649,
  },
  manufacturing: {
    core: { color: 'black' },
    surfaces: {
      front: { material: 'Walnut', customColor: null },
      back: { material: 'Walnut', customColor: null },
    },
    identity: {
      name: 'Nikhil Rakesh',
      fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
      logoMode: 'iq',
      logoPlacement: { scale: 1, x: 0, y: 0, align: 'right' },
      craft: 'engrave',
    },
    back: { layout: 'pure', backLayout: 'pure', tapToConnect: true },
  },
} satisfies CanonicalCardPayload

const input = {
  email: 'owner@example.com',
  designId: 'IQD-ABC123',
  payload,
  firstName: 'Nikhil',
  lastName: 'Rakesh',
}

function createStore(): RegistrationIntentStore & {
  replace: ReturnType<typeof vi.fn>
} {
  return {
    replace: vi.fn().mockResolvedValue(undefined),
  }
}

describe('registration intent repository', () => {
  it('stores only the token hash and expires the intent exactly thirty minutes later', async () => {
    const store = createStore()
    const now = new Date('2026-09-05T10:00:00.000Z')

    const result = await createRegistrationIntent(input, {
      store,
      now: () => now,
      createToken: () => ({ raw: 'raw-secret', hash: 'a'.repeat(64) }),
      createIntentId: () => 'intent-1',
    })

    expect(result).toEqual({ token: 'raw-secret', intentId: 'intent-1' })
    expect(store.replace).toHaveBeenCalledWith({
      id: 'intent-1',
      token_hash: 'a'.repeat(64),
      email: 'owner@example.com',
      design_id: 'IQD-ABC123',
      design_payload: input.payload,
      schema_version: 1,
      first_name: 'Nikhil',
      last_name: 'Rakesh',
      status: 'pending',
      expires_at: '2026-09-05T10:30:00.000Z',
    })
    expect(JSON.stringify(store.replace.mock.calls)).not.toContain('raw-secret')
  })

  it('supersedes a live duplicate through one atomic store operation', async () => {
    const store = createStore()
    const now = new Date('2026-09-05T10:00:00.000Z')

    await createRegistrationIntent(input, {
      store,
      now: () => now,
      createToken: () => ({ raw: 'new-secret', hash: 'b'.repeat(64) }),
      createIntentId: () => 'intent-2',
    })

    expect(store.replace).toHaveBeenCalledTimes(1)
    expect(store).not.toHaveProperty('cancelPending')
    expect(store).not.toHaveProperty('insert')
  })

  it('reports a safe error when atomic replacement fails', async () => {
    const store = createStore()
    store.replace.mockRejectedValue(new Error('database unavailable'))

    await expect(createRegistrationIntent(input, { store })).rejects.toThrow('Unable to save your registration')
    expect(store.replace).toHaveBeenCalledTimes(1)
  })
})
