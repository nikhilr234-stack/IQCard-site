import { Buffer } from 'node:buffer'

export const CARD_SCHEMA_VERSION = '1.0' as const
export const CARD_MATERIALS = ['White', 'Black', 'Graphite', 'Terracotta', 'Mustard', 'Oxblood', 'Walnut', 'Natural Oak', 'Travertine', 'Concrete', 'Ivory Marble', 'Oxidised Steel'] as const
export const CARD_AVAILABLE_MATERIALS = CARD_MATERIALS
export const CARD_BACK_LAYOUTS = ['pure', 'branded', 'identity', 'custom'] as const
export const CARD_TONES = ['dark', 'light'] as const
export const CARD_COMPOSITIONS = ['signature', 'editorial', 'minimal', 'centered', 'statement'] as const
const CARD_CORES = ['black', 'white'] as const
const CARD_CRAFTS = ['printed', 'engrave', 'emboss', 'deboss', 'foil'] as const
const CARD_CUSTOM_COLORS = ['black', 'white', 'gray', 'silver', 'red', 'blue'] as const
const CARD_ALIGNS = ['left', 'center', 'right'] as const
const CARD_LOGO_MODES = ['iq', 'custom'] as const

export type CardMaterial = typeof CARD_MATERIALS[number]
export type CardAvailableMaterial = typeof CARD_AVAILABLE_MATERIALS[number]
export type CardBackLayout = typeof CARD_BACK_LAYOUTS[number]
export type CardTone = typeof CARD_TONES[number]
export type CardComposition = typeof CARD_COMPOSITIONS[number]
type CardCore = typeof CARD_CORES[number]
type CardCraft = typeof CARD_CRAFTS[number]
type CardCustomColor = typeof CARD_CUSTOM_COLORS[number]
type CardAlign = typeof CARD_ALIGNS[number]
type FineTune = { nameScale: number; x: number; y: number; align: CardAlign }
type CardLogo = { mode: 'iq' | 'custom'; dataUrl: string | null; filename: string | null; mimeType: string | null; scale: number; x: number; y: number; align: CardAlign }

export type CanonicalCardConfiguration = {
  material: CardAvailableMaterial
  core: CardCore
  customColor: CardCustomColor | null
  identity: { name: string; tone: CardTone; composition: CardComposition; fineTune: FineTune }
  logo: CardLogo
  backLayout: CardBackLayout
  craft: CardCraft
}

export type CanonicalCardPayload = {
  schemaVersion: typeof CARD_SCHEMA_VERSION
  configuration: CanonicalCardConfiguration
  pricing: { currency: 'INR'; pricingVersion: 'flat-inr-v2'; provisional: true; components: { base: number; material: number; craft: number; customLogoSetup: number }; total: number }
  manufacturing: {
    core: { color: CardCore }
    surfaces: { front: { material: CardAvailableMaterial; customColor: string | null }; back: { material: CardAvailableMaterial; customColor: string | null } }
    identity: { name: string; fineTune: FineTune; logoMode: string; logoPlacement: { scale: number; x: number; y: number; align: CardAlign }; craft: CardCraft }
    back: { layout: CardBackLayout; backLayout: CardBackLayout; tapToConnect: true }
  }
}

export const CARD_BASE_PRICE = 799
const MATERIAL_PRICES: Record<CardAvailableMaterial, number> = { White: 0, Black: 0, Graphite: 0, Terracotta: 0, Mustard: 0, Oxblood: 0, Walnut: 0, 'Natural Oak': 0, Travertine: 0, Concrete: 0, 'Ivory Marble': 0, 'Oxidised Steel': 0 }
const CRAFT_PRICES: Record<CardCraft, number> = { printed: 0, engrave: 0, emboss: 0, deboss: 0, foil: 0 }
const CUSTOM_COLOR_HEX: Record<CardCustomColor, string> = { black: '#111214', white: '#f8f8f5', gray: '#8a8f98', silver: '#c8cbd0', red: '#d63447', blue: '#3f72d8' }

function record(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null }
function allowed<const T extends readonly string[]>(value: unknown, values: T): T[number] | null { return typeof value === 'string' && values.includes(value) ? value as T[number] : null }
function optionalAllowed<const T extends readonly string[]>(value: unknown, values: T, fallback: T[number]): T[number] | null { return value === undefined ? fallback : allowed(value, values) }
function bounded(value: unknown, min: number, max: number, fallback: number): number | null { return value === undefined ? fallback : typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null }
function normalizedName(value: unknown): string | null { if (typeof value !== 'string') return null; const name = value.trim().replace(/\s+/g, ' '); return name.length <= 26 ? name : null }

function canonicalFineTune(value: unknown): FineTune | null {
  const input = value === undefined ? {} : record(value)
  if (!input) return null
  const nameScale = bounded(input.nameScale, .5, 2, 1), x = bounded(input.x, -50, 50, 0), y = bounded(input.y, -40, 40, 0), align = optionalAllowed(input.align, CARD_ALIGNS, 'left')
  return nameScale === null || x === null || y === null || !align ? null : { nameScale, x, y, align }
}

function canonicalLogo(value: unknown): CardLogo | null {
  const input = value === undefined ? {} : record(value)
  if (!input) return null
  const mode = optionalAllowed(input.mode, CARD_LOGO_MODES, 'iq'), scale = bounded(input.scale, .5, 2, 1), x = bounded(input.x, -50, 50, 0), y = bounded(input.y, -40, 40, 0), align = optionalAllowed(input.align, CARD_ALIGNS, 'left')
  if (!mode || scale === null || x === null || y === null || !align) return null
  if (mode === 'iq') return { mode, dataUrl: null, filename: null, mimeType: null, scale, x, y, align }
  if (typeof input.dataUrl !== 'string' || typeof input.filename !== 'string') return null
  const filename = input.filename.trim(), match = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/]*={0,2})$/.exec(input.dataUrl)
  if (!filename || filename.length > 128 || !match || Buffer.from(match[2], 'base64').byteLength > 1_000_000) return null
  return { mode, dataUrl: input.dataUrl, filename, mimeType: match[1], scale, x, y, align }
}

function canonicalConfiguration(value: unknown): CanonicalCardConfiguration | null {
  const configuration = record(value), identity = record(configuration?.identity)
  if (!configuration || !identity) return null
  const material = allowed(configuration.material, CARD_AVAILABLE_MATERIALS), core = optionalAllowed(configuration.core, CARD_CORES, 'black'), suppliedTone = allowed(identity.tone, CARD_TONES), composition = allowed(identity.composition, CARD_COMPOSITIONS), backLayout = allowed(configuration.backLayout, CARD_BACK_LAYOUTS), craft = optionalAllowed(configuration.craft, CARD_CRAFTS, 'engrave')
  const customColor = configuration.customColor === undefined || configuration.customColor === null ? null : allowed(configuration.customColor, CARD_CUSTOM_COLORS)
  const name = normalizedName(identity.name), fineTune = canonicalFineTune(identity.fineTune), logo = canonicalLogo(configuration.logo)
  if (!material || !core || !suppliedTone || !composition || !backLayout || !craft || (customColor === null && configuration.customColor != null) || name === null || !fineTune || !logo) return null
  return { material, core, customColor, identity: { name, tone: suppliedTone, composition, fineTune }, logo, backLayout, craft }
}

export function canonicalizeCardPayload(value: unknown): CanonicalCardPayload | null {
  const payload = record(value)
  if (!payload || payload.schemaVersion !== CARD_SCHEMA_VERSION) return null
  const configuration = canonicalConfiguration(payload.configuration)
  if (!configuration) return null
  const material = MATERIAL_PRICES[configuration.material], craft = CRAFT_PRICES[configuration.craft], customLogoSetup = 0, customColor = configuration.customColor ? CUSTOM_COLOR_HEX[configuration.customColor] : null
  return { schemaVersion: CARD_SCHEMA_VERSION, configuration, pricing: { currency: 'INR', pricingVersion: 'flat-inr-v2', provisional: true, components: { base: CARD_BASE_PRICE, material, craft, customLogoSetup }, total: CARD_BASE_PRICE }, manufacturing: { core: { color: configuration.core }, surfaces: { front: { material: configuration.material, customColor }, back: { material: configuration.material, customColor } }, identity: { name: configuration.identity.name, fineTune: configuration.identity.fineTune, logoMode: configuration.logo.mode, logoPlacement: { scale: configuration.logo.scale, x: configuration.logo.x, y: configuration.logo.y, align: configuration.logo.align }, craft: configuration.craft }, back: { layout: configuration.backLayout, backLayout: configuration.backLayout, tapToConnect: true } } }
}
