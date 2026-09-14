import { describe, expect, it } from 'vitest'
import { HOME_CTA_HREF, HOME_SECTION_IDS, HOME_NAV_ITEMS } from './homepage-content'

describe('landing page content contract', () => {
  it('routes every primary call to action into the guest customizer', () => {
    expect(HOME_CTA_HREF).toBe('/customize')
  })

  it('keeps the navigation sections stable for deep links', () => {
    expect(HOME_NAV_ITEMS.map((item) => item.href)).toEqual(HOME_SECTION_IDS.map((id) => `#${id}`))
  })
})
