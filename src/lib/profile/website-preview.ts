import { getLinkIcon } from './link-icons'
import { isValidProfileLinkUrl, normalizeProfileLinkUrl } from './validation'

export type WebsitePreviewData = { title: string; description: string; screenshotUrl: string | null }

export function getWebsitePreviewTarget(input: string): string | null {
  const normalized = normalizeProfileLinkUrl(input)
  if (!isValidProfileLinkUrl(normalized)) return null
  const url = new URL(normalized)
  if (!['http:', 'https:'].includes(url.protocol)) return null
  if (getLinkIcon('', normalized).key !== 'external') return null
  const host = url.hostname.toLowerCase()
  if (!host.includes('.') || /^[\d.]+$/.test(host) || url.port) return null
  if (/(?:^|\.)(?:localhost|local|internal|lan|home|test|invalid)$/.test(host)) return null
  // Capture the public page, never a query containing a token or personal data.
  return `${url.origin}${url.pathname}`
}

function record(input: unknown): Record<string, unknown> | null {
  return typeof input === 'object' && input !== null && !Array.isArray(input) ? input as Record<string, unknown> : null
}

function screenshotUrl(input: unknown): string | null {
  if (typeof input !== 'string' || input.length > 4096) return null
  try {
    const url = new URL(input)
    const providerHost = url.hostname === 'microlink.io' || url.hostname.endsWith('.microlink.io') || url.hostname === 'microlink-cdn.s3.amazonaws.com'
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && providerHost ? url.href : null
  } catch {
    return null
  }
}

export function parseWebsitePreview(input: unknown): WebsitePreviewData | null {
  const payload = record(input)
  const data = record(payload?.data)
  if (payload?.status !== 'success' || !data) return null
  const text = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, limit) : ''
  return {
    title: text(data.title, 160),
    description: text(data.description, 240),
    screenshotUrl: screenshotUrl(record(data.screenshot)?.url),
  }
}

// This loader is called only by a visible client component, never during SSR.
// Share in-flight requests between the desktop and mobile template compositions.
const previews = new Map<string, { expiresAt: number; value: Promise<WebsitePreviewData | null> }>()

export function loadWebsitePreview(input: string): Promise<WebsitePreviewData | null> {
  const target = getWebsitePreviewTarget(input)
  if (!target) return Promise.resolve(null)
  const cached = previews.get(target)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  if (previews.size >= 128) previews.delete(previews.keys().next().value as string)

  const value = (async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 45_000)
    try {
      const endpoint = new URL('https://api.microlink.io/')
      endpoint.searchParams.set('url', target)
      endpoint.searchParams.set('screenshot', 'true')
      endpoint.searchParams.set('viewport.width', '1280')
      endpoint.searchParams.set('viewport.height', '720')
      endpoint.searchParams.set('viewport.deviceScaleFactor', '1')
      const response = await fetch(endpoint.href, {
        signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
      })
      if (!response.ok) return null
      return parseWebsitePreview(await response.json())
    } catch {
      return null
    } finally {
      clearTimeout(timer)
    }
  })()
  previews.set(target, { expiresAt: Date.now() + 5 * 60_000, value })
  void value.then((result) => {
    if (result && previews.get(target)?.value === value) {
      previews.set(target, { expiresAt: Date.now() + 24 * 60 * 60_000, value })
    }
  })
  return value
}
