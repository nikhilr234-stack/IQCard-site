import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SavedCardRenderer } from './saved-card-renderer'

describe('saved card renderer', () => {
  it('never uses avatar or initials data as a card fallback', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/dashboard/saved-card-renderer.tsx'), 'utf8')
    expect(source).toContain('card.engravedName')
    expect(source).toContain('card.logoPlacement')
    expect(source).toContain('Saved card configuration unavailable')
    expect(source).not.toContain('initials(')
    expect(source).not.toContain('photoUrl')
  })

  it('uses the saved custom color as the visible material surface', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')
    expect(css).toContain('.owner-card[style]{background:linear-gradient')
    expect(css).toContain('var(--owner-card-color)')
  })

  it('renders the usable custom-logo asset supplied by saved-card parsing', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8='
    const html = renderToStaticMarkup(createElement(SavedCardRenderer, { card: {
      available: true,
      designId: 'IQ-CUSTOM',
      material: 'walnut',
      finish: 'engrave',
      engravedName: 'Ava Stone',
      logoPlacement: 'right',
      logoDataUrl: dataUrl,
      nfcLabel: 'IQ-CUSTOM',
      customColor: null,
      core: 'black',
    } }))

    expect(html).toContain(`src="${dataUrl}"`)
    expect(html).not.toContain('>iq</span>')
  })
})
