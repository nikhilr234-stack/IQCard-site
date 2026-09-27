import { describe, expect, it } from 'vitest'

import {
  applyDesignPreset,
  applyColorPalette,
  applyTheme,
  calculateContrastRatio,
  DEFAULT_PROFILE_DESIGN,
  getAutoTextColor,
  hasLowTextContrast,
  normalizeDesign,
  resetDesignSection,
  resetProfileDesign,
  resolveEffectiveDesign,
} from './design'
import type { CoverPresentation } from './types'

describe('profile design normalization', () => {
  it('provides complete version 1 defaults for legacy design values', () => {
    expect(normalizeDesign(undefined)).toEqual(DEFAULT_PROFILE_DESIGN)
    expect(normalizeDesign({ version: 9, background: { color: 'red' } })).toMatchObject({
      version: 1,
      background: { color: DEFAULT_PROFILE_DESIGN.background.color, text: 'auto', accent: DEFAULT_PROFILE_DESIGN.background.accent },
    })
  })

  it('normalizes manual colors to six-digit hex and falls back malformed values', () => {
    expect(normalizeDesign({ background: { color: '#abc', text: '#12345678', accent: 'url(javascript:alert(1))' } }).background)
      .toEqual(DEFAULT_PROFILE_DESIGN.background)
    expect(normalizeDesign({ background: { color: '#A1b2C3', text: '#abcdef', accent: '#010203' } }).background)
      .toEqual({ color: '#A1B2C3', text: '#ABCDEF', accent: '#010203' })
  })

  it('chooses whichever of pure black or white has greater contrast', () => {
    expect(getAutoTextColor('#FFFFFF')).toBe('#000000')
    expect(getAutoTextColor('#000000')).toBe('#FFFFFF')
    expect(getAutoTextColor('#777777')).toBe('#000000')
  })

  it('uses WCAG contrast and warns without changing a low-contrast manual choice', () => {
    expect(calculateContrastRatio('#000000', '#FFFFFF')).toBe(21)
    expect(hasLowTextContrast('#777777', '#777777')).toBe(true)
    expect(normalizeDesign({ background: { color: '#777777', text: '#777777' } }).background.text).toBe('#777777')
  })
})

describe('shared design operations', () => {
  it('uses a template-safe effective link layout without mutating stored design', () => {
    const stored = normalizeDesign({ links: { style: 'cards' } })
    const effective = resolveEffectiveDesign('minimal', stored)

    expect(stored.links.style).toBe('cards')
    expect(effective.links.style).toBe('rows')
  })

  it('applies only a preset design and preserves template, content, and links', () => {
    const presentation = {
      template: 'minimal',
      cover: { coverPath: null, overlay: 0.38, focalY: 50, alignment: 'lower-left', photoPathOverride: null },
      design: DEFAULT_PROFILE_DESIGN,
      content: { full_name: 'Ada' },
    } as unknown as CoverPresentation
    const result = applyDesignPreset(presentation, 'editorial')

    expect(result.template).toBe('minimal')
    expect((result as unknown as { content: { full_name: string } }).content.full_name).toBe('Ada')
    expect(result.design).not.toEqual(DEFAULT_PROFILE_DESIGN)
    expect(result.design?.version).toBe(1)
  })

  it('resets exactly the requested section to IQ defaults', () => {
    const changed = normalizeDesign({
      background: { color: '#112233', text: '#FFFFFF', accent: '#445566' },
      typography: { family: 'mono', scale: 'large', weight: 'bold' },
    })
    const reset = resetDesignSection(changed, 'typography')

    expect(reset.typography).toEqual(DEFAULT_PROFILE_DESIGN.typography)
    expect(reset.background).toEqual(changed.background)
  })

  it('changes only the palette colors when a quick palette is selected', () => {
    const changed = normalizeDesign({ typography: { family: 'mono' }, profile: { photoShape: 'square' } })
    const result = applyColorPalette(changed, 'ivory')

    expect(result.background).toEqual({ color: '#F5F2EA', text: 'auto', accent: '#8A674A' })
    expect(result.typography).toEqual(changed.typography)
    expect(result.profile).toEqual(changed.profile)
    expect(result.links).toEqual(changed.links)
  })

  it('applies a theme starting palette without replacing explicit manual colors', () => {
    expect(applyTheme(DEFAULT_PROFILE_DESIGN, 'dark').background).toEqual({ color: '#111113', text: 'auto', accent: '#FF4F9A' })
    const manual = normalizeDesign({ background: { color: '#123456', text: '#ABCDEF', accent: '#654321' } })
    expect(applyTheme(manual, 'dark').background).toEqual(manual.background)
  })

  it('resets the complete design to shipped IQ defaults', () => {
    expect(resetProfileDesign()).toEqual(DEFAULT_PROFILE_DESIGN)
  })
})
