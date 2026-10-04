import type { SavedCardViewModel } from '@/lib/dashboard/saved-card'

export function SavedCardRenderer({ card, variant = 'hero' }: { card: SavedCardViewModel; variant?: 'hero' | 'compact' }) {
  if (!card.available) return <div className="owner-card-unavailable">Saved card configuration unavailable</div>
  return <iframe className={`owner-atelier-preview owner-atelier-preview--${variant}`} src={`/customize?preview=1&design=${encodeURIComponent(card.designId)}`} title={`Saved ${card.material} card for ${card.engravedName}`} loading="lazy" />
}
