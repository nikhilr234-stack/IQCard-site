import { afterEach, describe, expect, it, vi } from 'vitest'
import { getWebsitePreviewTarget, parseWebsitePreview } from './website-preview'

afterEach(() => vi.unstubAllGlobals())

describe('website preview destinations', () => {
  it('accepts a bare domain and omits query strings and fragments from capture requests', () => {
    expect(getWebsitePreviewTarget('www.example.in/work?token=private#section')).toBe('https://www.example.in/work')
  })

  it.each(['https://linkedin.com/in/ada', 'https://www.instagram.com/ada', 'https://github.com/ada', 'mailto:ada@example.com', 'tel:+44123456789', 'https://localhost/', 'https://studio.local/', 'http://127.0.0.1/', 'http://192.168.1.1/', 'https://studio.internal/', 'https://example.com:8443/', 'javascript:alert(1)'])('does not send social, contact or private destinations to the capture provider: %s', (url) => {
    expect(getWebsitePreviewTarget(url)).toBeNull()
  })

  it('keeps a social host compact even if it is labeled Website', () => {
    expect(getWebsitePreviewTarget('https://linkedin.com/in/ada')).toBeNull()
  })
})

describe('website preview response', () => {
  it('reads real page copy and the screenshot while bounding text length', () => {
    expect(parseWebsitePreview({ status: 'success', data: {
      title: '  IQ Card  ', description: '  A physical identity object.  ',
      screenshot: { url: 'https://iad.microlink.io/homepage.png' },
    } })).toEqual({ title: 'IQ Card', description: 'A physical identity object.', screenshotUrl: 'https://iad.microlink.io/homepage.png' })
  })

  it('keeps metadata when there is no screenshot instead of inventing a page image', () => {
    expect(parseWebsitePreview({ status: 'success', data: { title: 'Example', description: null, screenshot: null } })).toEqual({ title: 'Example', description: '', screenshotUrl: null })
  })

  it.each(['javascript:alert(1)', 'http://iad.microlink.io/image.png', 'https://microlink.io.evil.example/image.png', 'https://user:password@iad.microlink.io/image.png'])('rejects unexpected screenshot destinations: %s', (url) => {
    expect(parseWebsitePreview({ status: 'success', data: { screenshot: { url } } })?.screenshotUrl).toBeNull()
  })

  it.each([null, {}, { status: 'fail' }, { status: 'success', data: [] }])('ignores a failed or malformed provider response', (value) => {
    expect(parseWebsitePreview(value)).toBeNull()
  })
})

describe('website capture requests', () => {
  it('shares one capture across desktop/mobile copies and never sends website query tokens', async () => {
    vi.resetModules()
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'success', data: {
      title: 'Example', description: 'Design studio', screenshot: { url: 'https://iad.microlink.io/example.png' },
    } }), { headers: { 'Content-Type': 'application/json' } }))
    vi.stubGlobal('fetch', fetch)
    const { loadWebsitePreview } = await import('./website-preview')
    const [first, second] = await Promise.all([
      loadWebsitePreview('https://example.com/?token=one'), loadWebsitePreview('https://example.com/?token=two'),
    ])
    expect(first?.title).toBe('Example')
    expect(second).toEqual(first)
    expect(fetch).toHaveBeenCalledOnce()
    const request = new URL(fetch.mock.calls[0][0])
    expect(request.origin).toBe('https://api.microlink.io')
    expect(request.searchParams.get('url')).toBe('https://example.com/')
    expect(request.searchParams.get('screenshot')).toBe('true')
    expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
  })

  it('returns no preview on quota errors and does not retry on every render', async () => {
    vi.resetModules()
    const fetch = vi.fn().mockResolvedValue(new Response('', { status: 429 }))
    vi.stubGlobal('fetch', fetch)
    const { loadWebsitePreview } = await import('./website-preview')
    expect(await loadWebsitePreview('https://example.com/')).toBeNull()
    expect(await loadWebsitePreview('https://example.com/')).toBeNull()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
