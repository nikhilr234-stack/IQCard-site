import { CoverProfile } from '@/components/cover-profile'
import { PublicProfileCard } from '@/components/public-profile-card'
import type { CoverPresentation, Profile } from '@/lib/profile/types'

type PublicProfileProps = {
  profile: Profile
  presentation: CoverPresentation
  preview?: boolean
}

export function PublicProfile({ profile, presentation, preview = false }: PublicProfileProps) {
  if (presentation.template === 'cover') {
    return <CoverProfile profile={profile} presentation={presentation} preview={preview} />
  }

  return <PublicProfileCard profile={profile} preview={preview} />
}
