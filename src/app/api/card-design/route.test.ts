import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const deps = vi.hoisted(() => ({ account: vi.fn(), registration: vi.fn(), handoff: vi.fn(), admin: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ getCurrentAccount: deps.account }))
vi.mock('@/lib/registration/repository', () => ({ getLatestClaimedRegistrationIntent: deps.registration }))
vi.mock('@/lib/checkout/repository', () => ({ getLatestCheckoutHandoff: deps.handoff }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: deps.admin }))
import { GET, PUT } from './route'
const configuration = { core: 'black', material: 'Ivory Marble', craft: 'engrave', customColor: null, backLayout: 'pure', identity: { name: 'Rohan Biligi', tone: 'light', composition: 'signature', fineTune: { align: 'left', nameScale: 1, x: 0, y: 0 } }, logo: { mode: 'iq', dataUrl: null, filename: null, mimeType: null, align: 'right', scale: 1, x: 0, y: 0 } }
describe('authenticated saved card', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    deps.account.mockResolvedValue({ id: 'owner-1' })
    deps.registration.mockResolvedValue({ design_id: 'IQD-REAL', design_payload: { schemaVersion: '1.0', configuration } })
    deps.handoff.mockResolvedValue(null)
  })
  it('returns the exact owned configuration without lowercasing material or replacing tone/alignment', async () => {
    const response = await GET(new NextRequest('https://iqcard.in/api/card-design?design=IQD-REAL'))
    expect(await response.json()).toEqual({ id: 'IQD-REAL', configuration })
    expect(response.headers.get('cache-control')).toContain('no-store')
  })
  it('does not expose a card to signed-out visitors', async () => {
    deps.account.mockResolvedValue(null)
    expect((await GET(new NextRequest('https://iqcard.in/api/card-design'))).status).toBe(401)
  })
  it('never substitutes a different design ID for the requested saved card', async () => {
    expect((await GET(new NextRequest('https://iqcard.in/api/card-design?design=IQD-OTHER'))).status).toBe(404)
  })
  it('rejects saving a card from another owner or an unrelated origin', async () => {
    const body = JSON.stringify({ id: 'IQD-OTHER', payload: { schemaVersion: '1.0', configuration } })
    const request = (origin: string) => new NextRequest('https://iqcard.in/api/card-design', { method: 'PUT', headers: { origin, 'content-type': 'application/json' }, body })
    expect((await PUT(request('https://evil.example'))).status).toBe(403)
    expect((await PUT(request('https://iqcard.in'))).status).toBe(404)
  })
  it('saves an owned refinement so dashboard retrieval returns the updated configuration', async () => {
    const refined = { ...configuration, material: 'Walnut' }
    const query = { eq: () => query, select: () => query, maybeSingle: async () => ({ data: { design_id: 'IQD-REAL' }, error: null }) }
    deps.admin.mockReturnValue({ from: () => ({ update: (value: { design_payload: unknown }) => {
      deps.registration.mockResolvedValue({ design_id: 'IQD-REAL', design_payload: value.design_payload })
      return query
    } }) })
    const response = await PUT(new NextRequest('https://iqcard.in/api/card-design', { method: 'PUT', headers: { origin: 'https://iqcard.in', 'content-type': 'application/json' }, body: JSON.stringify({ id: 'IQD-REAL', payload: { schemaVersion: '1.0', configuration: refined } }) }))
    expect(response.status).toBe(200)
    const reloaded = await GET(new NextRequest('https://iqcard.in/api/card-design?design=IQD-REAL'))
    expect((await reloaded.json()).configuration).toEqual(refined)
  })

})
