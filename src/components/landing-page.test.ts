// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './landing-page'
import { HOME_NAV_ITEMS } from '@/lib/landing/homepage-content'

describe('LandingPage', () => {
  it('gives returning owners a login link', () => {
    const html = renderToStaticMarkup(createElement(LandingPage))

    expect(html).toContain('href="/login"')
    expect(html).toContain('>Log in</a>')
    expect(html).toContain('Designed by NRG STUDIO')
  })

  it('explains the product, price and purchase action in server-rendered content', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(createElement(LandingPage)), 'text/html')
    expect(doc.querySelector('h1')?.textContent).toContain('Your business card.')
    expect(doc.querySelector('main')?.textContent).toContain('NFC business card')
    expect(doc.querySelector('main')?.textContent).toContain('₹799')
    const purchaseLinks = [...doc.querySelectorAll('a')].filter(a => /Design your card/.test(a.textContent ?? ''))
    expect(purchaseLinks.length).toBeGreaterThanOrEqual(3)
    expect(purchaseLinks.every(a => a.getAttribute('href') === '/customize')).toBe(true)
    expect(doc.querySelector('script[src="/landing.js"]')).toBeNull()
  })

  it('provides real navigation targets and native answers before hydration', () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(createElement(LandingPage)), 'text/html')
    for (const item of HOME_NAV_ITEMS) expect(doc.querySelector(item.href)).not.toBeNull()
    for (const link of doc.querySelectorAll('a[href^="#"]')) {
      expect(doc.getElementById(link.getAttribute('href')!.slice(1))).not.toBeNull()
    }
    expect(doc.querySelectorAll('h1')).toHaveLength(1)
    expect(doc.querySelectorAll('details > summary').length).toBeGreaterThanOrEqual(5)
    expect(doc.querySelector('main')?.textContent).toContain('NFC-enabled')
    expect(doc.querySelector('main')?.textContent).not.toContain('QR')
  })
})
