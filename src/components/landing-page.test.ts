import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './landing-page'

describe('LandingPage', () => {
  it('gives returning owners a login link', () => {
    const html = renderToStaticMarkup(createElement(LandingPage))

    expect(html).toContain('href="/login"')
    expect(html).toContain('>Log in</a>')
    expect(html).toContain('Designed by NRG STUDIO')
  })
})
