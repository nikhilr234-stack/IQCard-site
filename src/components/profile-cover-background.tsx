import Image from 'next/image'

import { profileCoverImageUrl } from '@/lib/profile/media-urls'
import type { NormalizedCoverPresentation } from '@/lib/profile/types'

export function ProfileCoverBackground({
  presentation,
  preview = false,
}: {
  presentation: NormalizedCoverPresentation
  preview?: boolean
}) {
  const { cover } = presentation
  const imageUrl = cover.backgroundEnabled
    ? profileCoverImageUrl(cover.coverPath, preview ? 'private' : 'published')
    : null

  if (!imageUrl) return null

  return <div className="profile-cover-background" data-profile-cover-background aria-hidden="true">
    <Image
      src={imageUrl}
      alt=""
      fill
      sizes="100vw"
      preload={!preview}
      unoptimized={preview}
      style={{ objectFit: 'cover', objectPosition: `center ${cover.focalY}%` }}
    />
    <span style={{ backgroundColor: `rgba(0, 0, 0, ${cover.overlay})` }} />
  </div>
}
