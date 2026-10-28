/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminOrderControls } from './controls'

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => navigation }))

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

function setValue(control: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = control instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLSelectElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value')?.set?.call(control, value)
  control.dispatchEvent(new Event('input', { bubbles: true }))
  control.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('AdminOrderControls', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    navigation.refresh.mockReset()
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root.render(
      <AdminOrderControls orderId="order-1" paymentStatus="paid" fulfillmentStatus="in_production" profileConfirmed trackingCarrier="" trackingNumber="" />,
    ))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('requires manual tracking details before recording shipment and refreshes after save', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ ok: true, outcome: 'updated' }))
    vi.stubGlobal('fetch', fetchMock)
    const status = host.querySelector('select')
    const form = host.querySelector('form')
    if (!status || !form) throw new Error('Missing shipment fields')

    await act(async () => {
      setValue(status, 'shipped')
    })
    const carrierAfterSelection = host.querySelectorAll<HTMLInputElement>('input')[0]
    const trackingAfterSelection = host.querySelectorAll<HTMLInputElement>('input')[1]
    if (!carrierAfterSelection || !trackingAfterSelection) throw new Error('Missing tracking inputs')
    await act(async () => {
      setValue(carrierAfterSelection, 'DHL')
      setValue(trackingAfterSelection, 'TRACK-123')
    })
    await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

    expect(fetchMock).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(String(init.body))).toEqual({ fulfillmentStatus: 'shipped', trackingCarrier: 'DHL', trackingNumber: 'TRACK-123' })
    expect(navigation.refresh).toHaveBeenCalledOnce()
    expect(host.textContent).toContain('Order update saved in its history.')
  })

  it('explains that refund states are recorded after off-provider processing', async () => {
    expect(host.textContent).toContain('process the refund with the payment provider separately')
    expect([...host.querySelectorAll('button')].map((button) => button.textContent).join(' ')).toContain('Record refund requested')
  })

  it('does not offer production until the customer confirms a published NFC destination', async () => {
    await act(async () => root.render(
      <AdminOrderControls orderId="order-1" paymentStatus="paid" fulfillmentStatus="awaiting_profile" profileConfirmed={false} trackingCarrier="" trackingNumber="" />,
    ))

    expect(host.textContent).toContain('Wait for the customer to publish and confirm the NFC destination')
    expect([...host.querySelectorAll('option')].map((option) => option.value)).not.toContain('in_production')
  })

  it('keeps in-progress fulfillment actions available while a refund is pending', async () => {
    await act(async () => root.render(
      <AdminOrderControls orderId="order-1" paymentStatus="refund_pending" fulfillmentStatus="in_production" profileConfirmed trackingCarrier="" trackingNumber="" />,
    ))

    expect([...host.querySelectorAll('option')].map((option) => option.value)).toEqual(['', 'shipped', 'cancelled'])
    expect(host.textContent).toContain('Refund status is separate from shipment and delivery tracking.')
  })

  it('does not start production after a refund has been requested', async () => {
    await act(async () => root.render(
      <AdminOrderControls orderId="order-1" paymentStatus="refunded" fulfillmentStatus="awaiting_profile" profileConfirmed trackingCarrier="" trackingNumber="" />,
    ))

    expect([...host.querySelectorAll('option')].map((option) => option.value)).toEqual(['', 'cancelled'])
    expect(host.textContent).not.toContain('Record refund requested')
    expect(host.textContent).toContain('Production cannot start after a refund has been requested.')
  })

  it('requires an in-production order to be cancelled before it can ship after a refund', async () => {
    await act(async () => root.render(
      <AdminOrderControls orderId="order-1" paymentStatus="refunded" fulfillmentStatus="in_production" profileConfirmed trackingCarrier="" trackingNumber="" />,
    ))

    expect([...host.querySelectorAll('option')].map((option) => option.value)).toEqual(['', 'cancelled'])
    expect(host.textContent).toContain('A completed refund means an unshipped order must be cancelled.')
  })
})
