import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingPage } from './landing-page'

describe('LandingPage', () => {
  it('gives returning owners a login link', () => {
    const html = renderToStaticMarkup(createElement(LandingPage))

    expect(html).toContain('href="/login"')
    expect(html).toContain('>Log in</a>')
    expect(html).toContain('A product vision by NRG STUDIO')
    expect(html).toContain('Designed by Nikki · Directed by Ashwin')
    expect(html).not.toMatch(/nikhil|rakesh|benki/i)
    expect(html).toContain('Adam Randy')
    expect(html).toContain('A tap can show off their vibe.')
    expect(html).toContain('Each profile tells a different story.')
    expect(html).toContain('id="iq-profile-vibes"')
  })
})
