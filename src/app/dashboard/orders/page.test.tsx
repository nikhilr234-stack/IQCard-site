import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const deps = vi.hoisted(() => ({ account: vi.fn(), orders: vi.fn(), redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`) }) }))
vi.mock('@/lib/auth/account', () => ({ getVerifiedCurrentAccount: deps.account }))
vi.mock('@/lib/orders/repository', () => ({ listOrdersForOwner: deps.orders }))
vi.mock('next/navigation', () => ({ redirect: deps.redirect }))

describe('customer order history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    deps.account.mockResolvedValue({ id: 'owner-a', email: 'owner@example.com', role: 'client' })
    deps.orders.mockResolvedValue([])
  })

  async function renderPage() {
    const { default: Page } = await import('./page')
    return renderToStaticMarkup(await Page())
  }

  it('provides checkout from an empty order history', async () => {
    const html = await renderPage()
    expect(html).toContain('No orders yet')
    expect(html).toContain('href="/dashboard/orders/checkout"')
  })

  it('preserves the order page destination when sign-in is required', async () => {
    deps.account.mockResolvedValue(null)
    await expect(renderPage()).rejects.toThrow('redirect:/login?next=%2Fdashboard%2Forders')
  })

  it('renders persisted order totals and a link to each order', async () => {
    deps.orders.mockResolvedValue([{ id: 'order-a', order_number: 'IQ-TEST-1', total_paise: 92400, design_id: 'IQD-ABC123', payment_status: 'paid', fulfillment_status: 'in_production' }])
    const html = await renderPage()
    expect(html).toContain('IQ-TEST-1')
    expect(html).toContain('₹924.00')
    expect(html).toContain('in production')
    expect(html).toContain('href="/dashboard/orders/order-a"')
  })
})
