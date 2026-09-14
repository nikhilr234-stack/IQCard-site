import { describe, expect, it } from 'vitest'
import { parseSavedCardDesign } from './saved-card'

const customLogoDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg=='

describe('saved card design', () => {
  it('maps the exact saved customizer configuration into a card view model', () => {
    expect(parseSavedCardDesign({
      design_id: 'IQ-164597',
      payload: {
        schemaVersion: '1.0',
        configuration: {
          core: 'black', material: 'Walnut', craft: 'engrave', customColor: 'black', backLayout: 'pure',
          identity: { name: 'Ava Stone', tone: 'dark', composition: 'signature', fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' } },
          logo: { mode: 'iq', dataUrl: null, filename: null, mimeType: null, align: 'right', x: 50, y: 18, scale: 0.7 },
        },
      },
    })).toMatchObject({ available: true, designId: 'IQ-164597', material: 'walnut', finish: 'engrave', engravedName: 'Ava Stone', logoPlacement: 'right', customColor: '#111214', core: 'black' })
  })

  it('reports unavailable instead of fabricating a card', () => {
    expect(parseSavedCardDesign(null)).toEqual({ available: false })
  })

  it('does not pretend a custom logo was saved when its binary asset is unavailable', () => {
    expect(parseSavedCardDesign({
      design_id: 'IQ-CUSTOM',
      payload: { configuration: { material: 'Walnut', identity: { name: 'Ava Stone' }, logo: { mode: 'custom', filename: 'mark.svg' } } },
    })).toEqual({ available: false })
  })

  it('keeps a canonical custom-logo design available and passes its image to the renderer', () => {
    const card = parseSavedCardDesign({
      design_id: 'IQ-CUSTOM',
      payload: {
        schemaVersion: '1.0',
        configuration: {
          core: 'black',
          material: 'Walnut',
          customColor: null,
          identity: {
            name: 'Ava Stone',
            tone: 'dark',
            composition: 'signature',
            fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
          },
          logo: {
            mode: 'custom',
            dataUrl: customLogoDataUrl,
            filename: 'mark.svg',
            mimeType: 'image/svg+xml',
            scale: 0.7,
            x: 12,
            y: -4,
            align: 'right',
          },
          backLayout: 'pure',
          craft: 'engrave',
        },
        pricing: {},
        manufacturing: {},
      },
    })

    expect(card).toMatchObject({
      available: true,
      designId: 'IQ-CUSTOM',
      material: 'walnut',
      finish: 'engrave',
      engravedName: 'Ava Stone',
      logoPlacement: 'right',
      logoDataUrl: customLogoDataUrl,
      core: 'black',
    })
  })
})
