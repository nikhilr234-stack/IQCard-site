/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebsitePreviewCard } from './website-preview-card'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('website preview card', () => {
  let host: HTMLDivElement
  let root: Root
  let visible: IntersectionObserverCallback
  let fetch: ReturnType<typeof vi.fn>
  const providerResponse = { status: 'success', data: {
    title: 'IQ Card — An introduction, redesigned.',
    description: 'A physical identity object that opens your profile in one tap.',
    screenshot: { url: 'https://iad.microlink.io/iqcard.png' },
  } }

  beforeEach(async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerResponse)))
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) { visible = callback }
      observe() {}
      disconnect() {}
    })
    await act(async () => root.render(<WebsitePreviewCard label="Website" url="https://iqcard.in/" />))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  })

  it('loads the screenshot and actual website copy only when the card is visible', async () => {
    expect(fetch).not.toHaveBeenCalled()
    await act(async () => visible([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(host.querySelector('img')?.getAttribute('src')).toBe('https://iad.microlink.io/iqcard.png')
    expect(host.textContent).toContain('IQ Card — An introduction, redesigned.')
    expect(host.textContent).toContain('A physical identity object that opens your profile in one tap.')
    expect(host.querySelector('a')?.href).toBe('https://iqcard.in/')
  })

  it('retains a usable link when the screenshot image cannot load', async () => {
    await act(async () => visible([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    await act(async () => host.querySelector('img')?.dispatchEvent(new Event('error')))
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('a')?.href).toBe('https://iqcard.in/')
    expect(host.textContent).toContain('IQ Card — An introduction, redesigned.')
  })

  it('keeps the website usable when the provider is unavailable', async () => {
    fetch.mockResolvedValue(new Response('', { status: 429 }))
    await act(async () => root.render(<WebsitePreviewCard label="Studio" url="https://example.in/unavailable" />))
    await act(async () => visible([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(host.querySelector('img')).toBeNull()
    expect(host.querySelector('a')?.href).toBe('https://example.in/unavailable')
    expect(host.textContent).toContain('example.in')
    expect(host.textContent).not.toContain('Loading preview')
  })
})
