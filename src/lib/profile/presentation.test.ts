import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESENTATION, normalizePresentation, resolvePresentation } from './presentation'

describe('profile presentation normalization', () => {
  it('clamps Cover controls without discarding a saved Cover when Minimal is selected', () => {
    const value = normalizePresentation({
      draft: { template: 'minimal', cover: { overlay: 9, focalY: -2, alignment: 'center', coverPath: 'cover.jpg' } },
    })

    expect(value.draft).toMatchObject({
      template: 'minimal',
      cover: { overlay: 0.7, focalY: 0, alignment: 'center', coverPath: 'cover.jpg' },
    })
  })

  it('fills missing draft and published settings from Minimal defaults', () => {
    expect(normalizePresentation(null)).toEqual(DEFAULT_PRESENTATION)
  })

  it('keeps draft and published snapshots independently resolvable', () => {
    const value = normalizePresentation({
      draft: { template: 'cover', cover: { coverPath: 'draft.jpg' } },
      published: { template: 'minimal' },
    })

    expect(resolvePresentation(value, 'draft').template).toBe('cover')
    expect(resolvePresentation(value, 'published').template).toBe('minimal')
    expect(resolvePresentation(value, 'draft').cover.coverPath).toBe('draft.jpg')
  })
})
