import type { ProfileTemplate } from './types'

const TEMPLATE_VARIANTS = {
  cover: {
    defaultVariant: 'editorial-left',
    variants: [
      { id: 'editorial-left', label: 'Editorial Left', description: 'Identity at the lower left over the full cover.', thumbnail: 'cover-left' },
      { id: 'centered-hero', label: 'Centered Hero', description: 'A centered portrait and name lead the cover.', thumbnail: 'cover-center' },
      { id: 'bottom-sheet', label: 'Bottom Sheet', description: 'A quiet information sheet anchors the wallpaper.', thumbnail: 'cover-sheet' },
    ],
  },
  minimal: {
    defaultVariant: 'classic',
    variants: [
      { id: 'classic', label: 'Classic', description: 'The current restrained Minimal composition.', thumbnail: 'minimal-classic' },
      { id: 'oversized-name', label: 'Oversized Name', description: 'An editorial name hierarchy with quieter details.', thumbnail: 'minimal-oversized' },
      { id: 'swiss-grid', label: 'Swiss Grid', description: 'Precise left alignment and compact information.', thumbnail: 'minimal-grid' },
    ],
  },
  studio: {
    defaultVariant: 'portfolio-grid',
    variants: [
      { id: 'portfolio-grid', label: 'Portfolio Grid', description: 'Selected work leads in a portfolio grid.', thumbnail: 'studio-grid' },
      { id: 'hero-project', label: 'Hero Project', description: 'One featured project leads the page.', thumbnail: 'studio-hero' },
      { id: 'split-canvas', label: 'Split Canvas', description: 'Identity and work share a responsive split.', thumbnail: 'studio-split' },
    ],
  },
  executive: {
    defaultVariant: 'authority',
    variants: [
      { id: 'authority', label: 'Authority', description: 'Portrait and professional identity in balance.', thumbnail: 'executive-authority' },
      { id: 'centered-card', label: 'Centered Card', description: 'A centered portrait and credentials hierarchy.', thumbnail: 'executive-centered' },
      { id: 'compact-board', label: 'Compact Board', description: 'A concise executive layout with dense contacts.', thumbnail: 'executive-compact' },
    ],
  },
  signal: {
    defaultVariant: 'poster',
    variants: [
      { id: 'poster', label: 'Poster', description: 'An expressive poster-like identity composition.', thumbnail: 'signal-poster' },
      { id: 'type-first', label: 'Type First', description: 'Oversized typography takes the lead.', thumbnail: 'signal-type' },
      { id: 'split-signal', label: 'Split Signal', description: 'Identity and actions occupy distinct fields.', thumbnail: 'signal-split' },
    ],
  },
  index: {
    defaultVariant: 'directory',
    variants: [
      { id: 'directory', label: 'Directory', description: 'Links are organized into clear categories.', thumbnail: 'index-directory' },
      { id: 'compact-stack', label: 'Compact Stack', description: 'A tight link hierarchy keeps more above the fold.', thumbnail: 'index-stack' },
      { id: 'grid-index', label: 'Grid Index', description: 'Categorized utility blocks in a clean grid.', thumbnail: 'index-grid' },
    ],
  },
} as const satisfies Record<ProfileTemplate, {
  defaultVariant: string
  variants: ReadonlyArray<{ id: string; label: string; description: string; thumbnail: string }>
}>

export { TEMPLATE_VARIANTS }

export type TemplateVariantId<T extends ProfileTemplate = ProfileTemplate> =
  T extends ProfileTemplate ? (typeof TEMPLATE_VARIANTS)[T]['variants'][number]['id'] : never

export type TemplateSettings = {
  [Template in ProfileTemplate]: { variant: TemplateVariantId<Template> }
}

const TEMPLATE_IDS = Object.keys(TEMPLATE_VARIANTS) as ProfileTemplate[]

export const DEFAULT_TEMPLATE_SETTINGS = Object.fromEntries(
  TEMPLATE_IDS.map((template) => [template, { variant: TEMPLATE_VARIANTS[template].defaultVariant }]),
) as TemplateSettings

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeTemplateSettings(value: unknown): TemplateSettings {
  const input = isRecord(value) ? value : {}
  const normalized: Record<string, { variant: string }> = {}

  for (const template of TEMPLATE_IDS) {
    const templateInput = isRecord(input[template]) ? input[template] : {}
    const requestedVariant = templateInput.variant
    const validVariant = TEMPLATE_VARIANTS[template].variants.find(({ id }) => id === requestedVariant)
    normalized[template] = { variant: validVariant?.id ?? TEMPLATE_VARIANTS[template].defaultVariant }
  }

  return normalized as TemplateSettings
}

export function getTemplateVariants<T extends ProfileTemplate>(template: T) {
  return TEMPLATE_VARIANTS[template].variants
}
