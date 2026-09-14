import type { CoverPresentation, ProfilePresentation, ProfileTemplate } from './types'

export type { CoverPresentation, ProfilePresentation, ProfileTemplate }

const DEFAULT_SETTINGS: CoverPresentation = {
  template: 'minimal',
  cover: {
    coverPath: null,
    overlay: 0.38,
    focalY: 50,
    alignment: 'lower-left',
    photoPathOverride: null,
  },
}

export const DEFAULT_PRESENTATION = {
  draft: DEFAULT_SETTINGS,
  published: DEFAULT_SETTINGS,
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

function normalizeSettings(input: unknown): CoverPresentation {
  const source = isRecord(input) ? input : {}
  const cover = isRecord(source.cover) ? source.cover : {}
  const template: ProfileTemplate = source.template === 'cover' ? 'cover' : 'minimal'

  return {
    template,
    cover: {
      coverPath: optionalPath(cover.coverPath),
      overlay: clampNumber(cover.overlay, DEFAULT_SETTINGS.cover.overlay, 0.15, 0.7),
      focalY: clampNumber(cover.focalY, DEFAULT_SETTINGS.cover.focalY, 0, 100),
      alignment: cover.alignment === 'center' ? 'center' : 'lower-left',
      photoPathOverride: optionalPath(cover.photoPathOverride),
    },
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

export function resolvePresentation(value: ProfilePresentation, mode: 'draft' | 'published'): CoverPresentation {
  return mode === 'draft' ? value.draft : value.published
}
