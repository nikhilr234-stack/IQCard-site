import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /favicon.ico', () => {
  it('serves a cacheable IQ Card icon', async () => {
    const response = GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8')
    expect(response.headers.get('cache-control')).toContain('public')
    const icon = await response.text()
    expect(icon).toContain('aria-label="IQ Card"')
    expect(icon).toContain('fill="#0b0b0c"')
    expect(icon).toContain('font-size="46"')
    expect(icon).not.toContain('#ff4f9a')
  })

  it('ships the IQ mark as the app icon metadata asset', () => {
    const icon = readFileSync(resolve(process.cwd(), 'src/app/icon.svg'), 'utf8')

    expect(icon).toContain('aria-label="IQ Card"')
    expect(icon).toContain('fill="#0b0b0c"')
    expect(icon).toContain('font-size="46"')
  })
})
