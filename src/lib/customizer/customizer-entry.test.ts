import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const html = readFileSync(resolve(process.cwd(), 'public/customize/index.html'), 'utf8')
const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (markup: string) => { window: Window }
}

function mobileRule(selector: string) {
  const dom = new JSDOM(html)
  const rules = Array.from<CSSRule>(dom.window.document.styleSheets[0]?.cssRules ?? [])
  const mobileSheets = rules.filter(
    (rule): rule is CSSMediaRule =>
      rule.type === 4 && (rule as CSSMediaRule).conditionText === '(max-width:620px)',
  )

  return mobileSheets
    .flatMap((sheet) => Array.from<CSSRule>(sheet.cssRules))
    .find(
      (rule): rule is CSSStyleRule =>
        rule.type === 1 && (rule as CSSStyleRule).selectorText === selector,
    )
}

describe('IQ Card V1 customizer', () => {
  it('uses the approved six-step flow and material hierarchy', () => {
    expect(html).toContain("['core','material','identity','logo','craft','final']")
    expect(html).toContain("['White','Black','Graphite','Terracotta','Mustard','Oxblood','Walnut','Natural Oak','Travertine','Concrete','Ivory Marble','Oxidised Steel']")
    expect(html).toContain('12 materials')
  })

  it('keeps approved logo and craft controls while removing manual tone controls', () => {
    expect(html).toMatch(/logoUpload|custom logo|data-craft|Emboss|Deboss|Foil/i)
    expect(html).not.toContain('data-name-tone=')
    expect(html).toContain("setConfiguration({ core: button.dataset.core })")
  })

  it('uses the customer identity in the preview and render references', () => {
    expect(html).toContain("'YOUR NAME'")
    expect(html).toContain("ctx.fillStyle=light?'#ffffff':'#000000'")
  })

  it('shows the provisional quote before the customer confirms the build', () => {
    expect(html).toContain('id="commercialTotal"')
    expect(html).toContain('id="priceBase"')
    expect(html).toContain('id="priceMaterial"')
    expect(html).toContain('id="priceCraft"')
    expect(html).toContain('id="priceLogo"')
    expect(html).toContain('id="priceTotalBreakdown"')
    expect(html).toContain('id="orderReviewTotal"')
  })

  it('uses the homepage wordmark as the top-left brand link', () => {
    expect(html).toContain('<a class="brand" data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</a>')
    expect(html.match(/data-iq-brand="primary"/g)).toHaveLength(1)
    expect(html).not.toContain('class="brand-mark"')
  })

  it('keeps the mobile entry compact before the card experience', () => {
    expect(html).toContain('.topbar{height:60px;padding:0 20px}')
    expect(html).toContain('.hero{padding:24px 22px 18px;gap:0}')
    expect(html).toContain('.hero h1{font-size:44px}')
    expect(html).toContain('.hero p,.hero-meta{display:none}')
  })

  it('keeps the live card pinned while mobile controls use the page scroll', () => {
    expect(mobileRule('.atelier-shell')?.style.display).toBe('block')
    expect(mobileRule('.stage-wrap')?.style.position).toBe('sticky')
    expect(mobileRule('.stage-wrap')?.style.top).toBe('0')
    expect(mobileRule('.stage-wrap')?.style.height).toBe('280px')
    expect(mobileRule('.scroll-track')?.style.overflow).toBe('hidden')
    expect(mobileRule('.scroll-space')?.style.height).toBe('280px')
    expect(mobileRule('.sticky-stage')?.style.position).toBe('relative')
  })

  it('offers accessible named inspection views for touch users', () => {
    const document = new JSDOM(html).window.document
    const controls = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-inspection-view]'))

    expect(controls.map((button) => button.textContent?.trim())).toEqual(['Front', 'Edge', 'Back'])
    expect(controls.map((button) => button.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false'])
  })

  it('keeps navigation and the live total together in the mobile action bar', () => {
    const document = new JSDOM(html).window.document
    const actionBar = document.querySelector('.control-foot')

    expect(actionBar?.querySelector('#stepBack')?.textContent).toBe('Back')
    expect(actionBar?.querySelector('#stepNext')?.textContent).toBe('Continue')
    expect(actionBar?.querySelector('#mobileRunningTotal')?.getAttribute('aria-live')).toBe('polite')
  })

  it('pins the mobile action bar above the iPhone safe area', () => {
    const rule = mobileRule('.control-foot')

    expect(rule?.style.position).toBe('sticky')
    expect(rule?.style.bottom).toBe('0')
    expect(rule?.style.getPropertyValue('padding-bottom')).toContain('env(safe-area-inset-bottom)')
  })
})
