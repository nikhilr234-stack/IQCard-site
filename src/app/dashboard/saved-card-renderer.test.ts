import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SavedCardRenderer } from './saved-card-renderer'

describe('saved card renderer', () => {
  it('uses the same Atelier scene for every dashboard card, including compact previews', () => {
    const card = { available: true as const, designId: 'IQD-REAL', material: 'ivory marble', finish: 'engrave', engravedName: 'Rohan Biligi', nameLayout: { align: 'left', scale: 1, x: 0, y: 0 }, logoPlacement: 'right', logoLayout: { align: 'right', scale: 1, x: 0, y: 0 }, logoDataUrl: null, composition: 'signature', backLayout: 'pure', nfcLabel: 'IQD-REAL', customColor: null, core: 'black' }
    for (const variant of ['hero', 'compact'] as const) {
      const html = renderToStaticMarkup(createElement(SavedCardRenderer, { card, variant }))
      expect(html).toContain('<iframe')
      expect(html).toContain('/customize?preview=1&amp;design=IQD-REAL')
      expect(html).toContain('loading="lazy"')
      expect(html).not.toContain('owner-card__name')
    }
  })
  it('reports unavailable rather than inventing a replacement card', () => {
    expect(renderToStaticMarkup(createElement(SavedCardRenderer, { card: { available: false } }))).toContain('Saved card configuration unavailable')
  })
})
