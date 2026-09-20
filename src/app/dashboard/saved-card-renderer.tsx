import Image from 'next/image'
import type { SavedCardViewModel } from '@/lib/dashboard/saved-card'

export function SavedCardRenderer({ card, variant = 'hero' }: { card: SavedCardViewModel; variant?: 'hero' | 'compact' }) {
  if (!card.available) return <div className="owner-card-unavailable">Saved card configuration unavailable</div>
  const logoPlacement = card.logoDataUrl
    ? card.logoPlacement === 'right' ? 'right' : card.logoPlacement === 'center' ? 'center' : 'left'
    : 'left'
  const namePlacement = card.nameLayout.align === 'right' ? 'right' : card.nameLayout.align === 'center' ? 'center' : 'left'
  const cardStyle = {
    ...(card.customColor ? { '--owner-card-color': card.customColor } : {}),
    '--owner-card-name-scale': card.nameLayout.scale,
    '--owner-card-name-x': `${card.nameLayout.x}px`,
    '--owner-card-name-y': `${card.nameLayout.y}px`,
    '--owner-card-logo-scale': card.logoLayout.scale,
    '--owner-card-logo-x': `${card.logoLayout.x}px`,
    '--owner-card-logo-y': `${card.logoLayout.y}px`,
  } as React.CSSProperties
  return <div className={`owner-card owner-card--${variant}`} data-material={card.material ?? 'unknown'} data-core={card.core ?? 'black'} data-composition={card.composition} data-back-layout={card.backLayout} style={cardStyle} aria-label={`Saved ${card.material ?? ''} IQ card`}>
    {card.logoDataUrl
      ? <Image className={`owner-card__logo owner-card__logo--${logoPlacement}`} src={card.logoDataUrl} alt="" width={96} height={96} loading="lazy" unoptimized style={{ width: '18%', height: '18%', objectFit: 'contain' }} />
      : <span className={`owner-card__logo owner-card__logo--${logoPlacement}`}>iq</span>}
    <span className="owner-card__nfc">{card.nfcLabel ?? card.designId}</span>
    {card.engravedName ? <strong className={`owner-card__name owner-card__name--${namePlacement}`}>{card.engravedName}</strong> : null}
    <span className="owner-card__finish">{card.finish ?? 'Saved finish'}</span>
  </div>
}
