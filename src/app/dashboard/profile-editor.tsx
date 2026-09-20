'use client'

import { useEffect } from 'react'
import type { CoverPresentation, Profile } from '@/lib/profile/types'
import { LiveOwnerCenter } from './live-owner-center'

type Action = (formData: FormData) => void | Promise<void>
type SavedDesign = { design_id: string; payload: Record<string, unknown> }

type Props = {
  profile: Profile
  presentation: CoverPresentation
  savedDesign: SavedDesign | null
  saveProfileAction: Action
  publishAction: Action
  unpublishAction: Action
  uploadPhotoAction: Action
  deletePhotoAction: Action
  linkedinConfigured: boolean
  siteUrl: string
}

/**
 * `/dashboard` has one permanent owner experience. Profile editing is a
 * separate route so publishing state can never switch a person back to the
 * retired setup dashboard.
 */
export function ProfileEditor({ profile, presentation, savedDesign, siteUrl }: Props) {
  useEffect(() => {
    document.body.classList.add('v6-live-mode')
    return () => document.body.classList.remove('v6-live-mode')
  }, [])

  return <LiveOwnerCenter
    profile={profile}
    presentation={presentation}
    savedDesign={savedDesign}
    siteUrl={siteUrl}
    // This component is also rendered in server-only feedback tests, where
    // Next's client router is intentionally unavailable.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    onEditDetails={() => { window.location.href = '/dashboard/digital-profile' }}
  />
}
