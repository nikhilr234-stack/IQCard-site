import Image from 'next/image'
import type { SavedCardViewModel } from '@/lib/dashboard/saved-card'

export function SavedCardRenderer({ card, variant = 'hero' }: { card: SavedCardViewModel; variant?: 'hero' | 'compact' }) {
  if (!card.available) return <div className="owner-card-unavailable">Saved card configuration unavailable</div>
  const logoPlacement = card.logoPlacement === 'right' ? 'right' : card.logoPlacement === 'center' ? 'center' : 'left'
  const cardStyle = card.customColor ? { '--owner-card-color': card.customColor } as React.CSSProperties : undefined
  return <div className={`owner-card owner-card--${variant}`} data-material={card.material ?? 'unknown'} data-core={card.core ?? 'black'} style={cardStyle} aria-label={`Saved ${card.material ?? ''} IQ card`}>
    {card.logoDataUrl
      ? <Image className={`owner-card__logo owner-card__logo--${logoPlacement}`} src={card.logoDataUrl} alt="" width={96} height={96} loading="lazy" unoptimized style={{ width: '18%', height: '18%', objectFit: 'contain' }} />
      : <span className={`owner-card__logo owner-card__logo--${logoPlacement}`}>iq</span>}
    <span className="owner-card__nfc">{card.nfcLabel ?? card.designId}</span>
    {card.engravedName ? <strong className="owner-card__name">{card.engravedName}</strong> : null}
    <span className="owner-card__finish">{card.finish ?? 'Saved finish'}</span>
  </div>
}
