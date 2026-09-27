import { DEFAULT_PROFILE_DESIGN, normalizeDesign } from './design'
import type { CoverPresentation, NormalizedCoverPresentation, ProfilePresentation, ProfileTemplate } from './types'

export type { CoverPresentation, NormalizedCoverPresentation, ProfilePresentation, ProfileTemplate }

export const PROFILE_TEMPLATE_OPTIONS = [
  { id: 'minimal', number: '01', name: 'Minimal', description: 'Clean and editorial' },
  { id: 'cover', number: '02', name: 'Cover', description: 'Immersive and visual' },
  { id: 'studio', number: '03', name: 'Studio', description: 'Portfolio first' },
  { id: 'executive', number: '04', name: 'Executive', description: 'Portrait and authority' },
  { id: 'signal', number: '05', name: 'Signal', description: 'Bold and expressive' },
  { id: 'index', number: '06', name: 'Index', description: 'Every link, organized' },
] as const satisfies ReadonlyArray<{ id: ProfileTemplate; number: string; name: string; description: string }>

const PROFILE_TEMPLATE_IDS = new Set<ProfileTemplate>(PROFILE_TEMPLATE_OPTIONS.map(({ id }) => id))

function createDefaultSettings(): NormalizedCoverPresentation {
  return {
    template: 'cover',
    cover: {
      coverPath: null,
      overlay: 0.38,
      focalY: 50,
      alignment: 'lower-left',
      photoPathOverride: null,
    },
    design: normalizeDesign(DEFAULT_PROFILE_DESIGN),
  }
}

export const DEFAULT_PRESENTATION = {
  draft: createDefaultSettings(),
  published: createDefaultSettings(),
} as const satisfies ProfilePresentation

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalPath(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback
}

function normalizeSettings(input: unknown): NormalizedCoverPresentation {
  const source = isRecord(input) ? input : {}
  const cover = isRecord(source.cover) ? source.cover : {}
  const template = typeof source.template === 'string' && PROFILE_TEMPLATE_IDS.has(source.template as ProfileTemplate)
    ? source.template as ProfileTemplate
    : 'cover'

  return {
    template,
    cover: {
      coverPath: optionalPath(cover.coverPath),
      overlay: clampNumber(cover.overlay, 0.38, 0.15, 0.7),
      focalY: clampNumber(cover.focalY, 50, 0, 100),
      alignment: cover.alignment === 'center' ? 'center' : 'lower-left',
      photoPathOverride: optionalPath(cover.photoPathOverride),
    },
    design: normalizeDesign(source.design),
  }
}

export function normalizePresentation(input: unknown): ProfilePresentation {
  const source = isRecord(input) ? input : {}
  const value: ProfilePresentation = {
    draft: normalizeSettings(source.draft),
    published: normalizeSettings(source.published),
  }

  if (typeof source.profile_id === 'string') value.profile_id = source.profile_id
  return value
}

export function resolvePresentation(value: ProfilePresentation, mode: 'draft' | 'published'): NormalizedCoverPresentation {
  return mode === 'draft' ? value.draft : value.published
}
