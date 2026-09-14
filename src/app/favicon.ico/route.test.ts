import { describe, expect, it } from 'vitest'
import { GET } from './route'

describe('GET /favicon.ico', () => {
  it('serves a cacheable IQ Card icon', async () => {
    const response = GET()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/svg+xml; charset=utf-8')
    expect(response.headers.get('cache-control')).toContain('public')
    expect(await response.text()).toContain('aria-label="IQ Card"')
  })
})
