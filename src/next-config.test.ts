import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config'

describe('Server Action upload configuration', () => {
  it('uses the documented nested server action body limit', () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe('6mb')
  })

  it('does not place the ignored server action setting at the config top level', () => {
    expect(nextConfig).not.toHaveProperty('serverActions')
  })

  it('limits the local image optimizer to profile media and public homepage assets', () => {
    expect(nextConfig.images?.localPatterns).toEqual([
      { pathname: '/api/profile-photo' },
      { pathname: '/api/profile-cover' },
      { pathname: '/homepage/**' },
      { pathname: '/customize/surfaces/v2/**' },
    ])
    expect(nextConfig.images?.minimumCacheTTL).toBe(300)
  })
})
