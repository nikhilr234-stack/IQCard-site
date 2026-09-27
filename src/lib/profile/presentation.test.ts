import { describe, expect, it } from 'vitest'
import { DEFAULT_PRESENTATION, normalizePresentation, resolvePresentation } from './presentation'
import type { ProfilePresentation } from './types'

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

  it('fills missing draft and published settings from Cover defaults', () => {
    expect(normalizePresentation(null)).toEqual(DEFAULT_PRESENTATION)
    expect(DEFAULT_PRESENTATION.draft.template).toBe('cover')
    expect(DEFAULT_PRESENTATION.published.template).toBe('cover')
  })

  it('preserves an explicit non-Cover template', () => {
    expect(normalizePresentation({ draft: { template: 'studio' }, published: { template: 'signal' } })).toMatchObject({
      draft: { template: 'studio' },
      published: { template: 'signal' },
    })
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

  it('adds complete version 1 design defaults to legacy presentation JSON', () => {
    const value = normalizePresentation({ draft: { template: 'minimal', cover: { coverPath: null } } })

    expect(value.draft.design.version).toBe(1)
    expect(value.draft.design.background.text).toBe('auto')
    expect(value.draft.design).toEqual(DEFAULT_PRESENTATION.draft.design)
    expect(value.published.design).toEqual(DEFAULT_PRESENTATION.published.design)
  })

  it('normalizes malformed and missing text overrides to Auto without changing old cover fields', () => {
    const value = normalizePresentation({
      draft: { template: 'cover', cover: { coverPath: 'cover.webp', overlay: 0.52 }, design: { version: 0, background: { color: '#112233', text: 'rgb(0, 0, 0)' } } },
    })

    expect(value.draft.design).toMatchObject({ version: 1, background: { color: '#112233', text: 'auto' } })
    expect(value.draft.cover).toMatchObject({ coverPath: 'cover.webp', overlay: 0.52 })
  })

  it.each(['studio', 'executive', 'signal', 'index'] as const)('keeps the %s template selected when normalizing stored settings', (template) => {
    const value = normalizePresentation({ draft: { template }, published: { template } })

    expect(value.draft.template).toBe(template)
    expect(value.published.template).toBe(template)
  })

  it('does not share mutable defaults between draft and published snapshots', () => {
    const value = DEFAULT_PRESENTATION as unknown as ProfilePresentation
    value.draft.cover.coverPath = 'draft.jpg'
    value.draft.cover.overlay = 0.7

    expect(value.published.cover.coverPath).toBeNull()
    expect(value.published.cover.overlay).toBe(0.38)
  })
})
