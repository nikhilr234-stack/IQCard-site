import { CoverProfile } from '@/components/cover-profile'
import { ExecutiveProfile, IndexProfile, SignalProfile, StudioProfile } from '@/components/profile-templates'
import { PublicProfileCard } from '@/components/public-profile-card'
import type { CoverPresentation, Profile } from '@/lib/profile/types'

type PublicProfileProps = {
  profile: Profile
  presentation: CoverPresentation
  preview?: boolean
}

export function PublicProfile({ profile, presentation, preview = false }: PublicProfileProps) {
  switch (presentation.template) {
    case 'cover':
      return <CoverProfile profile={profile} presentation={presentation} preview={preview} />
    case 'studio':
      return <StudioProfile profile={profile} presentation={presentation} preview={preview} />
    case 'executive':
      return <ExecutiveProfile profile={profile} presentation={presentation} preview={preview} />
    case 'signal':
      return <SignalProfile profile={profile} presentation={presentation} preview={preview} />
    case 'index':
      return <IndexProfile profile={profile} presentation={presentation} preview={preview} />
    default:
      return <PublicProfileCard profile={profile} preview={preview} />
  }
}
