/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const routerRefresh = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: routerRefresh }) }))

import { RefreshWhilePending } from './refresh-while-pending'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('RefreshWhilePending', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(() => {
    vi.useFakeTimers()
    routerRefresh.mockReset()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root.render(<RefreshWhilePending orderId="order-local" />))
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('checks the owned order automatically and stops recovery checks on unmount', async () => {
    await act(async () => {})
    expect(fetch).toHaveBeenCalledWith('/api/orders/order-local/reconcile', { method: 'POST', cache: 'no-store' })
    await act(async () => { vi.advanceTimersByTime(30_000) })
    expect(fetch).toHaveBeenCalledTimes(2)
    act(() => root.unmount())
    root = createRoot(host)
    await act(async () => { vi.advanceTimersByTime(60_000) })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('refreshes the server-rendered order periodically while payment is pending', () => {
    act(() => vi.advanceTimersByTime(10_000))
    expect(routerRefresh).toHaveBeenCalledTimes(2)
  })
})
