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
      nameLayout: { align: 'left', scale: 1, x: 0, y: 0 },
      logoPlacement: 'right',
      logoLayout: { align: 'right', scale: 1, x: 0, y: 0 },
      logoDataUrl: dataUrl,
      composition: 'signature',
      backLayout: 'pure',
      nfcLabel: 'IQ-CUSTOM',
      customColor: null,
      core: 'black',
    } }))

    expect(html).toContain(`src="${dataUrl}"`)
    expect(html).not.toContain('>iq</span>')
  })

  it('anchors the built-in IQ platform mark on the left even for legacy right-aligned records', () => {
    const html = renderToStaticMarkup(createElement(SavedCardRenderer, { card: {
      available: true,
      designId: 'IQ-LEGACY',
      material: 'walnut',
      finish: 'engrave',
      engravedName: 'Ava Stone',
      nameLayout: { align: 'left', scale: 1, x: 0, y: 0 },
      logoPlacement: 'right',
      logoLayout: { align: 'right', scale: 1, x: 0, y: 0 },
      logoDataUrl: null,
      composition: 'signature',
      backLayout: 'pure',
      nfcLabel: 'IQ-LEGACY',
      customColor: null,
      core: 'black',
    } }))

    expect(html).toContain('owner-card__logo--left')
    expect(html).not.toContain('owner-card__logo--right')
  })

  it('preserves the saved composition and fine-tuned name and logo layout', () => {
    const html = renderToStaticMarkup(createElement(SavedCardRenderer, { card: {
      available: true,
      designId: 'IQ-FINE-TUNED',
      material: 'graphite',
      finish: 'foil',
      engravedName: 'Ava Stone',
      nameLayout: { align: 'center', scale: 1.4, x: 12, y: -4 },
      logoPlacement: 'left',
      logoLayout: { align: 'left', scale: 0.8, x: -6, y: 9 },
      logoDataUrl: null,
      composition: 'centered',
      backLayout: 'custom',
      nfcLabel: 'IQ-FINE-TUNED',
      customColor: null,
      core: 'black',
    } }))

    expect(html).toContain('data-composition="centered"')
    expect(html).toContain('data-back-layout="custom"')
    expect(html).toContain('--owner-card-name-scale:1.4')
    expect(html).toContain('--owner-card-logo-x:-6px')
  })
})
