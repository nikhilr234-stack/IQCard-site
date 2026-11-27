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
  })
  it('shows six full profile images with navigation to each slide', () => {
    const html = renderToStaticMarkup(createElement(LandingPage))
    for (const name of ['theo', 'leela', 'maya', 'jordan', 'sofia', 'aria']) {
      expect(html).toContain(`/homepage/vibes/${name}.webp`)
      expect(html).toContain(`aria-label="View profile ${['theo', 'leela', 'maya', 'jordan', 'sofia', 'aria'].indexOf(name) + 1}`)
    }
    expect(html).toContain('aria-label="Pause automatic slideshow"')
    expect(html).toContain('aria-label="Next profile"')
    expect(html).toContain('aria-label="Previous profile"')
    expect(html).toContain('aria-current="true"')
  })

})
