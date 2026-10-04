import { readFileSync } from 'node:fs'
// @ts-expect-error jsdom is a test runtime dependency.
import { JSDOM } from 'jsdom'
import { expect, it } from 'vitest'
import config from '../../../next.config'
it('allows only same-origin embedding of Atelier while other routes deny framing', async () => {
  const rules = await config.headers!()
  const atelier = rules.find(rule => rule.source === '/customize/:path*')
  expect(atelier?.headers).toContainEqual({ key: 'X-Frame-Options', value: 'SAMEORIGIN' })
  expect(rules[0].headers).toContainEqual({ key: 'X-Frame-Options', value: 'DENY' })
})

it('pins the narrow saved preview stage despite the mobile inspection override', () => {
  const dom = new JSDOM(readFileSync('public/customize/index.html', 'utf8'))
  const rules = Array.from(dom.window.document.styleSheets[0].cssRules) as CSSStyleRule[]
  const rule = rules.find(rule => rule.selectorText === '.saved-preview .sticky-stage')
  expect(rule?.style.top).toBe('0')
  dom.window.close()
})
