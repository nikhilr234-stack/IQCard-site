/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routerPush = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: routerPush }) }))
vi.mock('next/script', () => ({ default: () => null }))

import { CheckoutForm } from './checkout-form'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const savedCard = { schemaVersion: '1.0', configuration: { material: 'Walnut', identity: { name: 'Sample Person', tone: 'dark', composition: 'signature' }, backLayout: 'pure' } }
const order = {
  id: 'order-local-1', number: 'IQ-261003-000001', phone: '+919000000000', paymentStatus: 'pending',
  shippingAddress: { recipientName: 'Sample Person', line1: '1 Main Road', line2: '', locality: 'Town', city: 'Pune', state: 'MH', postalCode: '411001', country: 'IN' },
  cardSubtotalPaise: 79900, shippingPaise: 12500, taxPaise: 0, totalPaise: 92400,
}

describe('CheckoutForm payment confirmation', () => {
  let host: HTMLDivElement
  let root: Root
  let fetchMock: ReturnType<typeof vi.fn>
  let razorpayOpen: ReturnType<typeof vi.fn>
  let paymentConstructor: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    sessionStorage.clear()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    razorpayOpen = vi.fn()
    paymentConstructor = vi.fn(() => ({ open: razorpayOpen }))
    Object.defineProperty(window, 'Razorpay', { configurable: true, value: paymentConstructor })
    fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (!init?.method) return new Response(JSON.stringify({ ok: false }), { status: 404 })
      return new Response(JSON.stringify({
        ok: true,
        order,
        payment: { keyId: 'rzp_test_public', orderId: 'order_test123', amountPaise: 92400, currency: 'INR' },
      }), { status: 200 })
    })
    vi.stubGlobal('fetch', fetchMock)
    await act(async () => root.render(<CheckoutForm designId="IQD-ABC123" payload={savedCard} checkoutEnabled shippingPaise={12500} taxPaise={0} />))
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows the exact total before opening the payment modal', async () => {
    expect(host.textContent).toContain('Estimated total₹924.00')
    const form = host.querySelector('form')
    if (!form) throw new Error('Checkout form was not rendered')

    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

    expect(fetchMock).toHaveBeenCalledWith('/api/orders', expect.objectContaining({ method: 'POST' }))
    expect(host.textContent).toContain('Total₹924.00')
    expect(host.textContent).toContain('Pay ₹924.00 securely')
    expect(paymentConstructor).not.toHaveBeenCalled()

    const payButton = [...host.querySelectorAll('button')].find((button) => button.textContent?.includes('Pay ₹924.00'))
    if (!payButton) throw new Error('Review-total payment button was not rendered')
    await act(async () => payButton.click())
    expect(paymentConstructor).toHaveBeenCalledOnce()
    expect(razorpayOpen).toHaveBeenCalledOnce()
  })

  it('keeps checkout gated and explains that delivery details have not been saved', async () => {
    await act(async () => root.render(<CheckoutForm designId="IQD-ABC123" payload={savedCard} checkoutEnabled={false} shippingPaise={null} taxPaise={null} />))
    expect(host.textContent).toContain('Delivery details are saved when checkout is enabled and you submit them.')
    expect(host.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
    expect(host.textContent).toContain('Sample Person')
  })

  it('shows the frozen order design when an edited card is reopened', async () => {
    const snapshot = { ...savedCard, configuration: { ...savedCard.configuration, material: 'Graphite', identity: { name: 'Ordered Name', tone: 'dark', composition: 'signature' } } }
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true, order: { ...order, cardSnapshot: snapshot } }), { status: 200 }))
    await act(async () => root.render(<CheckoutForm key="resume" designId="IQD-ABC123" payload={savedCard} checkoutEnabled shippingPaise={12500} taxPaise={0} />))
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
    expect(host.textContent).toContain('Ordered Name')
    expect(host.textContent).toContain('graphite IQ Card')
    expect(host.textContent).not.toContain('Sample Person')
  })
})
