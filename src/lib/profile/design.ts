import type { CSSProperties } from 'react'

import type { CoverPresentation, ProfileDesign, ProfileTemplate } from './types'

export const DEFAULT_PROFILE_DESIGN: ProfileDesign = {
  version: 1,
  theme: 'auto',
  background: { color: '#FFFFFF', text: 'auto', accent: '#FF4F9A' },
  typography: { family: 'neo', scale: 'balanced', weight: 'regular' },
  profile: { photoShape: 'rounded', photoSize: 'medium', alignment: 'left' },
  links: { style: 'rows', showIcons: false, iconStyle: 'brand', radius: 'round', density: 'comfortable' },
  buttons: { style: 'solid', radius: 'pill' },
  footer: { showMadeWithIq: true, showProfessionalLabel: true },
}

const colorPalettes = {
  ivory: { color: '#F5F2EA', text: 'auto', accent: '#8A674A' },
  graphite: { color: '#34363A', text: 'auto', accent: '#C7B89B' },
  black: { color: '#111113', text: 'auto', accent: '#FF4F9A' },
  warmGrey: { color: '#E7E3DC', text: 'auto', accent: '#70665B' },
  sand: { color: '#E8D8BD', text: 'auto', accent: '#8A5D37' },
} satisfies Record<string, ProfileDesign['background']>

const themePalettes = {
  light: { color: '#F5F2EA', text: 'auto', accent: '#8A674A' },
  dark: { color: '#111113', text: 'auto', accent: '#FF4F9A' },
} satisfies Record<'light' | 'dark', ProfileDesign['background']>

export const COLOR_PALETTES = colorPalettes

export const DESIGN_PRESETS: Record<string, ProfileDesign> = {
  editorial: {
    ...DEFAULT_PROFILE_DESIGN,
    theme: 'light',
    background: colorPalettes.ivory,
    typography: { family: 'serif', scale: 'large', weight: 'regular' },
    profile: { photoShape: 'rounded', photoSize: 'large', alignment: 'left' },
    links: { style: 'rows', showIcons: true, iconStyle: 'mono', radius: 'soft', density: 'comfortable' },
    buttons: { style: 'outline', radius: 'soft' },
  },
  monochrome: {
    ...DEFAULT_PROFILE_DESIGN,
    theme: 'light',
    background: { color: '#F4F4F2', text: 'auto', accent: '#222222' },
    typography: { family: 'neo', scale: 'balanced', weight: 'medium' },
    links: { style: 'rows', showIcons: true, iconStyle: 'mono', radius: 'square', density: 'comfortable' },
    buttons: { style: 'outline', radius: 'square' },
  },
  warmLuxury: {
    ...DEFAULT_PROFILE_DESIGN,
    theme: 'light',
    background: colorPalettes.sand,
    typography: { family: 'serif', scale: 'balanced', weight: 'medium' },
    profile: { photoShape: 'rounded', photoSize: 'large', alignment: 'left' },
    links: { style: 'cards', showIcons: true, iconStyle: 'brand', radius: 'soft', density: 'comfortable' },
    buttons: { style: 'solid', radius: 'soft' },
  },
  darkPerformance: {
    ...DEFAULT_PROFILE_DESIGN,
    theme: 'dark',
    background: colorPalettes.black,
    typography: { family: 'neo', scale: 'large', weight: 'bold' },
    profile: { photoShape: 'square', photoSize: 'large', alignment: 'left' },
    links: { style: 'pills', showIcons: true, iconStyle: 'brand', radius: 'round', density: 'comfortable' },
    buttons: { style: 'solid', radius: 'pill' },
  },
  studio: {
    ...DEFAULT_PROFILE_DESIGN,
    theme: 'light',
    background: { color: '#F7F6F3', text: 'auto', accent: '#345C54' },
    typography: { family: 'humanist', scale: 'balanced', weight: 'medium' },
    profile: { photoShape: 'rounded', photoSize: 'medium', alignment: 'left' },
    links: { style: 'cards', showIcons: false, iconStyle: 'mono', radius: 'soft', density: 'comfortable' },
    buttons: { style: 'soft', radius: 'soft' },
  },
  minimalTech: {
    ...DEFAULT_PROFILE_DESIGN,
    theme: 'light',
    background: { color: '#F7F8FA', text: 'auto', accent: '#325E9A' },
    typography: { family: 'mono', scale: 'compact', weight: 'medium' },
    profile: { photoShape: 'square', photoSize: 'medium', alignment: 'left' },
    links: { style: 'rows', showIcons: true, iconStyle: 'mono', radius: 'square', density: 'compact' },
    buttons: { style: 'outline', radius: 'square' },
  },
}

export const DESIGN_PRESET_OPTIONS = [
  { id: 'editorial', label: 'Editorial' },
  { id: 'monochrome', label: 'Monochrome' },
  { id: 'warmLuxury', label: 'Warm Luxury' },
  { id: 'darkPerformance', label: 'Dark Performance' },
  { id: 'studio', label: 'Studio' },
  { id: 'minimalTech', label: 'Minimal Tech' },
] as const

export const TEMPLATE_CAPABILITIES: Record<ProfileTemplate, { linkStyles: ProfileDesign['links']['style'][]; defaultLinkStyle: ProfileDesign['links']['style'] }> = {
  cover: { linkStyles: ['icons', 'pills', 'rows', 'cards'], defaultLinkStyle: 'pills' },
  studio: { linkStyles: ['pills', 'rows', 'cards'], defaultLinkStyle: 'cards' },
  executive: { linkStyles: ['pills', 'rows', 'cards'], defaultLinkStyle: 'rows' },
  signal: { linkStyles: ['icons', 'pills', 'rows'], defaultLinkStyle: 'rows' },
  index: { linkStyles: ['icons', 'pills', 'rows'], defaultLinkStyle: 'rows' },
  minimal: { linkStyles: ['icons', 'pills', 'rows'], defaultLinkStyle: 'rows' },
}

export type DesignSection = 'color' | 'typography' | 'profile' | 'links' | 'buttons' | 'footer'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeHex(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toUpperCase() : fallback
}

function pick<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && values.includes(value as T) ? value as T : fallback
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export function normalizeDesign(input: unknown): ProfileDesign {
  const source = isRecord(input) ? input : {}
  const background = isRecord(source.background) ? source.background : {}
  const typography = isRecord(source.typography) ? source.typography : {}
  const profile = isRecord(source.profile) ? source.profile : {}
  const links = isRecord(source.links) ? source.links : {}
  const buttons = isRecord(source.buttons) ? source.buttons : {}
  const footer = isRecord(source.footer) ? source.footer : {}
  const color = normalizeHex(background.color, DEFAULT_PROFILE_DESIGN.background.color)
  const text = background.text === 'auto' ? 'auto' : normalizeHex(background.text, 'auto')

  return {
    version: 1,
    theme: pick(source.theme, ['light', 'dark', 'auto'], DEFAULT_PROFILE_DESIGN.theme),
    background: { color, text, accent: normalizeHex(background.accent, DEFAULT_PROFILE_DESIGN.background.accent) },
    typography: {
      family: pick(typography.family, ['neo', 'serif', 'mono', 'humanist'], DEFAULT_PROFILE_DESIGN.typography.family),
      scale: pick(typography.scale, ['compact', 'balanced', 'large'], DEFAULT_PROFILE_DESIGN.typography.scale),
      weight: pick(typography.weight, ['regular', 'medium', 'bold'], DEFAULT_PROFILE_DESIGN.typography.weight),
    },
    profile: {
      photoShape: pick(profile.photoShape, ['circle', 'rounded', 'square'], DEFAULT_PROFILE_DESIGN.profile.photoShape),
      photoSize: pick(profile.photoSize, ['small', 'medium', 'large'], DEFAULT_PROFILE_DESIGN.profile.photoSize),
      alignment: pick(profile.alignment, ['left', 'center'], DEFAULT_PROFILE_DESIGN.profile.alignment),
    },
    links: {
      style: pick(links.style, ['icons', 'pills', 'rows', 'cards'], DEFAULT_PROFILE_DESIGN.links.style),
      showIcons: bool(links.showIcons, DEFAULT_PROFILE_DESIGN.links.showIcons),
      iconStyle: pick(links.iconStyle, ['brand', 'mono'], DEFAULT_PROFILE_DESIGN.links.iconStyle),
      radius: pick(links.radius, ['square', 'soft', 'round'], DEFAULT_PROFILE_DESIGN.links.radius),
      density: pick(links.density, ['compact', 'comfortable'], DEFAULT_PROFILE_DESIGN.links.density),
    },
    buttons: {
      style: pick(buttons.style, ['solid', 'outline', 'soft'], DEFAULT_PROFILE_DESIGN.buttons.style),
      radius: pick(buttons.radius, ['square', 'soft', 'pill'], DEFAULT_PROFILE_DESIGN.buttons.radius),
    },
    footer: {
      showMadeWithIq: bool(footer.showMadeWithIq, DEFAULT_PROFILE_DESIGN.footer.showMadeWithIq),
      showProfessionalLabel: bool(footer.showProfessionalLabel, DEFAULT_PROFILE_DESIGN.footer.showProfessionalLabel),
    },
  }
}

function luminance(hex: string): number {
  const channels = hex.slice(1).match(/.{2}/g)!.map((part) => Number.parseInt(part, 16) / 255)
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

export function calculateContrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a)
  return Number(((lighter + 0.05) / (darker + 0.05)).toFixed(2))
}

export function getAutoTextColor(background: string): '#000000' | '#FFFFFF' {
  const color = normalizeHex(background, DEFAULT_PROFILE_DESIGN.background.color)
  return calculateContrastRatio(color, '#000000') >= calculateContrastRatio(color, '#FFFFFF') ? '#000000' : '#FFFFFF'
}

export function hasLowTextContrast(text: string, background: string): boolean {
  return calculateContrastRatio(text, background) < 4.5
}

export function resolveEffectiveDesign(template: ProfileTemplate, input: ProfileDesign): ProfileDesign {
  const design = normalizeDesign(input)
  const capabilities = TEMPLATE_CAPABILITIES[template]
  return capabilities.linkStyles.includes(design.links.style)
    ? design
    : { ...design, effectiveLinkStyleFallback: true, links: { ...design.links, style: capabilities.defaultLinkStyle } }
}

export function applyDesignPreset<T extends CoverPresentation>(presentation: T, preset: string): T {
  const design = DESIGN_PRESETS[preset]
  return design ? { ...presentation, design: normalizeDesign(design) } : presentation
}

export function resetDesignSection(design: ProfileDesign, section: DesignSection): ProfileDesign {
  const current = normalizeDesign(design)
  switch (section) {
    case 'color': return { ...current, theme: DEFAULT_PROFILE_DESIGN.theme, background: { ...DEFAULT_PROFILE_DESIGN.background } }
    case 'typography': return { ...current, typography: { ...DEFAULT_PROFILE_DESIGN.typography } }
    case 'profile': return { ...current, profile: { ...DEFAULT_PROFILE_DESIGN.profile } }
    case 'links': return { ...current, links: { ...DEFAULT_PROFILE_DESIGN.links } }
    case 'buttons': return { ...current, buttons: { ...DEFAULT_PROFILE_DESIGN.buttons } }
    case 'footer': return { ...current, footer: { ...DEFAULT_PROFILE_DESIGN.footer } }
  }
}

export function resetProfileDesign(): ProfileDesign {
  return normalizeDesign(DEFAULT_PROFILE_DESIGN)
}

export function applyColorPalette(design: ProfileDesign, palette: keyof typeof colorPalettes): ProfileDesign {
  return { ...normalizeDesign(design), background: { ...colorPalettes[palette] } }
}

export function applyTheme(design: ProfileDesign, theme: ProfileDesign['theme']): ProfileDesign {
  const current = normalizeDesign(design)
  if (theme === 'auto') return { ...current, theme }
  const previousTheme = current.theme === 'dark' ? 'dark' : 'light'
  const before = themePalettes[previousTheme]
  const after = themePalettes[theme]
  const followsTheme = (value: string, prior: string, shipped: string) => value === prior || (current.theme === 'auto' && value === shipped)
  return {
    ...current,
    theme,
    background: {
      color: followsTheme(current.background.color, before.color, DEFAULT_PROFILE_DESIGN.background.color) ? after.color : current.background.color,
      text: followsTheme(current.background.text, before.text, DEFAULT_PROFILE_DESIGN.background.text) ? after.text : current.background.text,
      accent: followsTheme(current.background.accent, before.accent, DEFAULT_PROFILE_DESIGN.background.accent) ? after.accent : current.background.accent,
    },
  }
}

export type ProfileDesignStyle = CSSProperties & Record<`--profile-${string}`, string | number | undefined>

const FONT_STACKS = {
  neo: 'Helvetica, Arial, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  humanist: 'Trebuchet MS, Arial, sans-serif',
} as const

export function getProfileDesignStyle(design: ProfileDesign): ProfileDesignStyle {
  const value = normalizeDesign(design)
  const themeApplied = value.theme !== 'auto'
  const colorChanged = value.background.color !== DEFAULT_PROFILE_DESIGN.background.color || themeApplied
  return {
    '--profile-bg': colorChanged ? value.background.color : undefined,
    '--profile-text': (value.background.text !== 'auto' || colorChanged) ? (value.background.text === 'auto' ? getAutoTextColor(value.background.color) : value.background.text) : undefined,
    '--profile-accent': (value.background.accent !== DEFAULT_PROFILE_DESIGN.background.accent || themeApplied) ? value.background.accent : undefined,
    '--profile-radius': value.links.radius === DEFAULT_PROFILE_DESIGN.links.radius ? undefined : value.links.radius === 'square' ? '2px' : value.links.radius === 'soft' ? '12px' : '999px',
    '--profile-font': value.typography.family === 'neo' ? undefined : FONT_STACKS[value.typography.family],
    '--profile-density': value.links.density === DEFAULT_PROFILE_DESIGN.links.density ? undefined : value.links.density === 'compact' ? '.82' : '1',
    '--profile-type-scale': value.typography.scale === 'compact' ? '.9' : value.typography.scale === 'large' ? '1.12' : '1',
    '--profile-weight': value.typography.weight === DEFAULT_PROFILE_DESIGN.typography.weight ? undefined : value.typography.weight === 'medium' ? '500' : '700',
    '--profile-photo-shape': value.profile.photoShape === DEFAULT_PROFILE_DESIGN.profile.photoShape ? undefined : value.profile.photoShape === 'circle' ? '50%' : '0',
    '--profile-photo-size': value.profile.photoSize === DEFAULT_PROFILE_DESIGN.profile.photoSize ? undefined : value.profile.photoSize === 'small' ? '.78' : '1.2',
    '--profile-alignment': value.profile.alignment === DEFAULT_PROFILE_DESIGN.profile.alignment ? undefined : value.profile.alignment,
    '--profile-link-style': value.links.style === DEFAULT_PROFILE_DESIGN.links.style ? undefined : value.links.style,
    '--profile-button-style': value.buttons.style === DEFAULT_PROFILE_DESIGN.buttons.style ? undefined : value.buttons.style,
    '--profile-button-radius': value.buttons.radius === DEFAULT_PROFILE_DESIGN.buttons.radius ? undefined : value.buttons.radius === 'square' ? '2px' : value.buttons.radius === 'soft' ? '12px' : '999px',
  }
}

export function getProfileDesignDataAttributes(design: ProfileDesign) {
  const value = normalizeDesign(design)
  const themeApplied = value.theme !== 'auto'
  return {
    'data-design-theme': themeApplied ? value.theme : undefined,
    'data-photo-shape': value.profile.photoShape !== DEFAULT_PROFILE_DESIGN.profile.photoShape ? value.profile.photoShape : undefined,
    'data-photo-size': value.profile.photoSize !== DEFAULT_PROFILE_DESIGN.profile.photoSize ? value.profile.photoSize : undefined,
    'data-profile-alignment': value.profile.alignment !== DEFAULT_PROFILE_DESIGN.profile.alignment ? value.profile.alignment : undefined,
    'data-type-scale': value.typography.scale !== DEFAULT_PROFILE_DESIGN.typography.scale ? value.typography.scale : undefined,
    'data-type-weight': value.typography.weight !== DEFAULT_PROFILE_DESIGN.typography.weight ? value.typography.weight : undefined,
    'data-button-style': value.buttons.style !== DEFAULT_PROFILE_DESIGN.buttons.style ? value.buttons.style : undefined,
    'data-button-radius': value.buttons.radius !== DEFAULT_PROFILE_DESIGN.buttons.radius ? value.buttons.radius : undefined,
    'data-show-made-with-iq': value.footer.showMadeWithIq ? undefined : 'false',
    'data-show-professional-label': value.footer.showProfessionalLabel ? undefined : 'false',
  }
}
