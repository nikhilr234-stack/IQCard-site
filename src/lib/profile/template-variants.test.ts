import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATE_SETTINGS, TEMPLATE_VARIANTS, getTemplateVariants, normalizeTemplateSettings } from './template-variants'
import type { ProfileTemplate } from './types'

describe('template variant registry', () => {
  it('defines exactly one canonical default that points to a listed variant per template', () => {
    const templates = Object.keys(TEMPLATE_VARIANTS) as ProfileTemplate[]

    expect(templates).toHaveLength(6)
    for (const template of templates) {
      const definition = TEMPLATE_VARIANTS[template]
      expect(definition.variants.filter(({ id }) => id === definition.defaultVariant)).toHaveLength(1)
      expect(DEFAULT_TEMPLATE_SETTINGS[template]).toEqual({ variant: definition.defaultVariant })
    }
  })

  it('publishes 18 unique variants with complete editor and thumbnail metadata', () => {
    const templates = Object.keys(TEMPLATE_VARIANTS) as ProfileTemplate[]
    const variants: Array<{ id: string; label: string; description: string; thumbnail: string }> = []
    for (const template of templates) variants.push(...getTemplateVariants(template))

    expect(variants).toHaveLength(18)
    expect(new Set(variants.map(({ id }) => id)).size).toBe(18)
    for (const variant of variants) {
      expect(variant.label).not.toBe('')
      expect(variant.description).not.toBe('')
      expect(variant.thumbnail).not.toBe('')
    }
  })

  it('normalizes all six settings and strips unknown metadata', () => {
    const normalized = normalizeTemplateSettings({
      cover: { variant: 'centered-hero', extra: 'ignored' },
      minimal: { variant: 'swiss-grid' },
      studio: { variant: 'hero-project' },
      executive: { variant: 'compact-board' },
      signal: { variant: 'type-first' },
      index: { variant: 'grid-index' },
      surprise: { variant: 'anything' },
    })

    expect(normalized).toEqual({
      cover: { variant: 'centered-hero' },
      minimal: { variant: 'swiss-grid' },
      studio: { variant: 'hero-project' },
      executive: { variant: 'compact-board' },
      signal: { variant: 'type-first' },
      index: { variant: 'grid-index' },
    })
    expect(Object.keys(normalized)).toHaveLength(6)
    expect(getTemplateVariants('cover').map(({ id }) => id)).toEqual(['editorial-left', 'centered-hero', 'bottom-sheet'])
  })
})
