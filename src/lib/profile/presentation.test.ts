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

  it('keeps legacy Cover backgrounds enabled and makes other legacy templates opt in', () => {
    expect(normalizePresentation({ draft: { template: 'cover', cover: { coverPath: 'cover.webp' } } }).draft.cover.backgroundEnabled).toBe(true)
    expect(normalizePresentation({ draft: { template: 'studio', cover: { coverPath: 'cover.webp' } } }).draft.cover.backgroundEnabled).toBe(false)
  })

  it('preserves an explicit background choice when changing templates', () => {
    const value = normalizePresentation({
      draft: { template: 'minimal', cover: { coverPath: 'cover.webp', backgroundEnabled: true } },
      published: { template: 'cover', cover: { coverPath: 'cover.webp', backgroundEnabled: false } },
    })

    expect(value.draft.cover.backgroundEnabled).toBe(true)
    expect(value.published.cover.backgroundEnabled).toBe(false)
  })

  it('normalizes What’s next items, drops empty rows, and caps the profile at three', () => {
    const value = normalizePresentation({ draft: { whatsNext: [
      { title: ' Launch ', description: ' Coming soon ', date: ' October ', url: ' https://example.com/launch ' },
      { title: 'Event', description: 'Meet me there', date: '', url: '' },
      { title: 'New project', description: 'A new collaboration', date: '', url: '' },
      { title: 'Fourth item', description: 'This should not be kept', date: '', url: '' },
      { title: '', description: '', date: '', url: '' },
      null,
    ] } })

    expect(value.draft.whatsNext).toEqual([
      { title: 'Launch', description: 'Coming soon', date: 'October', url: 'https://example.com/launch' },
      { title: 'Event', description: 'Meet me there', date: '', url: '' },
      { title: 'New project', description: 'A new collaboration', date: '', url: '' },
    ])
    expect(value.published.whatsNext).toEqual([])
  })

  it('normalizes legacy rows to each template current-layout default without rewriting input', () => {
    const legacy = { draft: { template: 'cover', cover: { coverPath: 'legacy.webp' } } }
    const original = JSON.stringify(legacy)
    const normalized = normalizePresentation(legacy)

    expect(normalized.draft.templateSettings).toEqual({
      cover: { variant: 'editorial-left' },
      minimal: { variant: 'classic' },
      studio: { variant: 'portfolio-grid' },
      executive: { variant: 'authority' },
      signal: { variant: 'poster' },
      index: { variant: 'directory' },
    })
    expect(JSON.stringify(legacy)).toBe(original)
  })

  it.each([
    ['cover', ['editorial-left', 'centered-hero', 'bottom-sheet']],
    ['minimal', ['classic', 'oversized-name', 'swiss-grid']],
    ['studio', ['portfolio-grid', 'hero-project', 'split-canvas']],
    ['executive', ['authority', 'centered-card', 'compact-board']],
    ['signal', ['poster', 'type-first', 'split-signal']],
    ['index', ['directory', 'compact-stack', 'grid-index']],
  ] as const)('accepts all curated %s variants without changing shared design', (template, variants) => {
    for (const variant of variants) {
      const value = normalizePresentation({ draft: {
        template,
        templateSettings: { [template]: { variant } },
        design: { background: { color: '#123456', text: '#FFFFFF', accent: '#ABCDEF' } },
      } })

      expect(value.draft.templateSettings[template].variant).toBe(variant)
      expect(value.draft.design.background).toEqual({ color: '#123456', text: '#FFFFFF', accent: '#ABCDEF' })
    }
  })

  it('safely falls back for malformed template settings and invalid variant IDs', () => {
    const value = normalizePresentation({ draft: {
      templateSettings: {
        cover: { variant: 'not-a-cover-layout' },
        minimal: null,
        studio: 'hero-project',
        executive: { variant: [] },
        signal: { variant: 'split-signal' },
      },
    } })

    expect(value.draft.templateSettings).toEqual({
      cover: { variant: 'editorial-left' },
      minimal: { variant: 'classic' },
      studio: { variant: 'portfolio-grid' },
      executive: { variant: 'authority' },
      signal: { variant: 'split-signal' },
      index: { variant: 'directory' },
    })
    expect(normalizePresentation({ draft: { templateSettings: [] } }).draft.templateSettings).toEqual({
      cover: { variant: 'editorial-left' },
      minimal: { variant: 'classic' },
      studio: { variant: 'portfolio-grid' },
      executive: { variant: 'authority' },
      signal: { variant: 'poster' },
      index: { variant: 'directory' },
    })
  })

  it('normalizes draft and published template variants independently', () => {
    const value = normalizePresentation({
      draft: { template: 'cover', templateSettings: { cover: { variant: 'bottom-sheet' } } },
      published: { template: 'minimal', templateSettings: { minimal: { variant: 'swiss-grid' } } },
    })

    expect(resolvePresentation(value, 'draft').templateSettings.cover.variant).toBe('bottom-sheet')
    expect(resolvePresentation(value, 'published').templateSettings.minimal.variant).toBe('swiss-grid')
    expect(resolvePresentation(value, 'published').templateSettings.cover.variant).toBe('editorial-left')
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
