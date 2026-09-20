import { canonicalizeCardPayload } from '@/lib/customizer/card-configuration'

export type SavedDesign = { design_id: string; payload: Record<string, unknown> } | null
export type SavedCardViewModel = { available: false } | { available: true; designId: string; material: string; finish: string; engravedName: string; nameLayout: { align: string; scale: number; x: number; y: number }; logoPlacement: string | null; logoLayout: { align: string; scale: number; x: number; y: number }; logoDataUrl: string | null; composition: string; backLayout: string; nfcLabel: string; customColor: string | null; core: string | null }

export function parseSavedCardDesign(savedDesign: SavedDesign): SavedCardViewModel {
  if (!savedDesign) return { available: false }
  const card = canonicalizeCardPayload(savedDesign.payload)
  if (!card) return { available: false }
  return {
    available: true,
    designId: savedDesign.design_id,
    material: card.configuration.material.toLowerCase(),
    finish: card.configuration.craft,
    engravedName: card.configuration.identity.name,
    nameLayout: { align: card.configuration.identity.fineTune.align, scale: card.configuration.identity.fineTune.nameScale, x: card.configuration.identity.fineTune.x, y: card.configuration.identity.fineTune.y },
    logoPlacement: card.configuration.logo.align,
    logoLayout: { align: card.configuration.logo.align, scale: card.configuration.logo.scale, x: card.configuration.logo.x, y: card.configuration.logo.y },
    logoDataUrl: card.configuration.logo.mode === 'custom' ? card.configuration.logo.dataUrl : null,
    composition: card.configuration.identity.composition,
    backLayout: card.configuration.backLayout,
    nfcLabel: savedDesign.design_id,
    customColor: card.manufacturing.surfaces.front.customColor,
    core: card.configuration.core,
  }
}

export function selectExactSavedCardDesign(...candidates: SavedDesign[]): SavedDesign {
  return candidates.find((candidate) => parseSavedCardDesign(candidate).available) ?? null
}

export function hasExactSavedCardDesign(card: SavedCardViewModel): card is Extract<SavedCardViewModel, { available: true }> { return card.available }
