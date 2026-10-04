import { expect, it } from 'vitest'
import config from '../../../next.config'
it('allows only same-origin embedding of Atelier while other routes deny framing', async () => {
  const rules = await config.headers!()
  const atelier = rules.find(rule => rule.source === '/customize/:path*')
  expect(atelier?.headers).toContainEqual({ key: 'X-Frame-Options', value: 'SAMEORIGIN' })
  expect(rules[0].headers).toContainEqual({ key: 'X-Frame-Options', value: 'DENY' })
})
