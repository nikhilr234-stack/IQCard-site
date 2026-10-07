import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const deps = vi.hoisted(() => ({ account: vi.fn(), order: vi.fn(), registration: vi.fn(), handoff: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`) }), notFound: vi.fn(() => { throw new Error('not-found') }) }))
vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: deps.account }))
vi.mock('@/lib/orders/repository', () => ({ getOrderForOwner: deps.order }))
vi.mock('@/lib/registration/repository', () => ({ getLatestClaimedRegistrationIntent: deps.registration }))
vi.mock('@/lib/checkout/repository', () => ({ getLatestCheckoutHandoff: deps.handoff }))
vi.mock('@/lib/orders/checkout-config', () => ({ getOrderCheckoutConfig: () => ({ ready: false, reason: 'disabled' }) }))
vi.mock('next/navigation', () => ({ redirect: deps.redirect, notFound: deps.notFound }))
vi.mock('./checkout-form', () => ({ CheckoutForm: (props: { designId: string; payload: { configuration: { identity: { name: string } } }; initialRequestKey?: string }) => <section data-request-key={props.initialRequestKey}>{props.designId} {props.payload.configuration.identity.name}</section> }))

const id = '11111111-1111-4111-8111-111111111111'
const key = '22222222-2222-4222-8222-222222222222'
describe('resume checkout from an account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deps.account.mockResolvedValue({ id: 'owner-a', email: 'owner@example.com', role: 'client' })
    deps.registration.mockResolvedValue(null)
    deps.handoff.mockResolvedValue(null)
    deps.order.mockResolvedValue({ id, client_request_key: key, payment_status: 'failed', design_id: 'IQD-ABC123', card_snapshot: { schemaVersion: '1.0', configuration: { material: 'Graphite', identity: { name: 'Frozen Name', tone: 'dark', composition: 'signature' }, backLayout: 'pure' } } })
  })
  async function renderPage() {
    const { default: Page } = await import('./page')
    return renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ order: id }) }))
  }
  it('resumes the existing immutable order without a current saved design', async () => {
    const html = await renderPage()
    expect(html).toContain('Frozen Name')
    expect(html).toContain(key)
    expect(deps.order).toHaveBeenCalledWith(id, 'owner-a')
    expect(deps.registration).not.toHaveBeenCalled()
  })
  it('does not expose an order belonging to another account', async () => {
    deps.order.mockResolvedValue(null)
    await expect(renderPage()).rejects.toThrow('not-found')
  })
  it('preserves the existing order on sign-in handoff', async () => {
    deps.account.mockResolvedValue(null)
    await expect(renderPage()).rejects.toThrow(`redirect:/login?next=${encodeURIComponent(`/dashboard/orders/checkout?order=${id}`)}`)
  })
})
