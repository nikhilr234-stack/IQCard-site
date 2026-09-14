import { canonicalizeCardPayload } from '@/lib/customizer/card-configuration'

export type SavedDesign = { design_id: string; payload: Record<string, unknown> } | null
export type SavedCardViewModel = { available: false } | { available: true; designId: string; material: string; finish: string; engravedName: string; logoPlacement: string | null; logoDataUrl: string | null; nfcLabel: string; customColor: string | null; core: string | null }

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
    logoPlacement: card.configuration.logo.align,
    logoDataUrl: card.configuration.logo.mode === 'custom' ? card.configuration.logo.dataUrl : null,
    nfcLabel: savedDesign.design_id,
    customColor: card.manufacturing.surfaces.front.customColor,
    core: card.configuration.core,
  }
}

export function hasExactSavedCardDesign(card: SavedCardViewModel): card is Extract<SavedCardViewModel, { available: true }> { return card.available }
