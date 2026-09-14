import { describe, expect, it } from 'vitest'
import nextConfig from '../next.config'

describe('Server Action upload configuration', () => {
  it('uses the documented nested server action body limit', () => {
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBe('6mb')
  })

  it('does not place the ignored server action setting at the config top level', () => {
    expect(nextConfig).not.toHaveProperty('serverActions')
  })
})
