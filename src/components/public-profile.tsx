import { CoverProfile } from '@/components/cover-profile'
import { ExecutiveProfile, IndexProfile, SignalProfile, StudioProfile } from '@/components/profile-templates'
import { PublicProfileCard } from '@/components/public-profile-card'
import { resolveEffectiveDesign } from '@/lib/profile/design'
import { normalizePresentation } from '@/lib/profile/presentation'
import type { CoverPresentation, Profile } from '@/lib/profile/types'

type PublicProfileProps = {
  profile: Profile
  presentation: CoverPresentation
  preview?: boolean
}

export function PublicProfile({ profile, presentation, preview = false }: PublicProfileProps) {
  const normalized = normalizePresentation({ draft: presentation }).draft
  const effective = { ...normalized, design: resolveEffectiveDesign(normalized.template, normalized.design) }
  switch (effective.template) {
    case 'cover':
      return <CoverProfile profile={profile} presentation={effective} preview={preview} />
    case 'studio':
      return <StudioProfile profile={profile} presentation={effective} preview={preview} />
    case 'executive':
      return <ExecutiveProfile profile={profile} presentation={effective} preview={preview} />
    case 'signal':
      return <SignalProfile profile={profile} presentation={effective} preview={preview} />
    case 'index':
      return <IndexProfile profile={profile} presentation={effective} preview={preview} />
    default:
      return <PublicProfileCard profile={profile} presentation={effective} preview={preview} />
  }
}
