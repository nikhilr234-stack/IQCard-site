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
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root.render(<RefreshWhilePending />))
  })

  afterEach(() => {
    act(() => root.unmount())
    host.remove()
    vi.useRealTimers()
  })

  it('refreshes the server-rendered order periodically while payment is pending', () => {
    act(() => vi.advanceTimersByTime(10_000))
    expect(routerRefresh).toHaveBeenCalledTimes(2)
  })
})
