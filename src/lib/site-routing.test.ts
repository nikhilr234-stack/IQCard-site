import { describe, expect, it } from 'vitest'
import { legacyRouteRedirects, publicProfileUrl } from './site-routing'

describe('canonical site routing', () => {
  it('redirects the legacy landing URL to the root landing page', () => {
    expect(legacyRouteRedirects).toContainEqual({ source: '/iq', destination: '/', permanent: true })
  })

  it('builds public profile URLs from the configured site origin', () => {
    expect(publicProfileUrl('https://profiles.example.com', 'ada-lovelace')).toBe('https://profiles.example.com/ada-lovelace')
    expect(publicProfileUrl('http://localhost:3000/', 'ada-lovelace')).toBe('http://localhost:3000/ada-lovelace')
  })
})
