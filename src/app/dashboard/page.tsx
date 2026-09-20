import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getOwnProfile, getOwnProfilePresentation } from '@/lib/profile/repository'
import { publishProfile, saveProfileDraft, unpublishProfile } from '@/app/actions/profile'
import { uploadProfilePhoto, deleteProfilePhoto } from '@/app/actions/profile-photo'
import { ProfileEditor } from './profile-editor'
import { isLinkedInImportConfigured } from '@/lib/linkedin'
import { getLatestCheckoutHandoff } from '@/lib/checkout/repository'
import { handoffIdentityName } from '@/lib/dashboard/dashboard-v6'
import { isOnboardingV2Enabled } from '@/lib/features'
import { getLatestClaimedRegistrationIntent } from '@/lib/registration/repository'
import { selectExactSavedCardDesign } from '@/lib/dashboard/saved-card'
import { getPublicEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

type DashboardPageProps = {
  searchParams: Promise<{ linkedin?: string | string[] }>
}

const linkedinFeedback = {
  imported: { message: 'LinkedIn details imported. Review your profile before publishing.', role: 'status' },
  cancelled: { message: 'LinkedIn import was cancelled.', role: 'status' },
  unavailable: { message: 'LinkedIn import is not configured right now.', role: 'alert' },
  invalid_state: { message: 'Your LinkedIn import session expired. Please try again.', role: 'alert' },
  temporary_error: { message: 'LinkedIn is temporarily unavailable. Please try again.', role: 'alert' },
  token_error: { message: 'LinkedIn could not complete sign-in. Please try again.', role: 'alert' },
  profile_error: { message: 'LinkedIn could not load your profile. Please try again.', role: 'alert' },
  save_error: { message: 'LinkedIn details could not be saved. Please try again.', role: 'alert' },
  unpublish_first: { message: 'Unpublish your profile before importing LinkedIn details.', role: 'alert' },
} as const

function parseLinkedInFeedback(value: string | string[] | undefined) {
  const code = Array.isArray(value) ? value[0] : value
  return code && Object.hasOwn(linkedinFeedback, code)
    ? linkedinFeedback[code as keyof typeof linkedinFeedback]
    : null
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const query = await searchParams
  const feedback = parseLinkedInFeedback(query.linkedin)
  const account = await requireAuthenticatedAccount()
  const registrationV2 = isOnboardingV2Enabled()
  const [registration, legacyDesign] = await Promise.all([
    registrationV2 ? getLatestClaimedRegistrationIntent(account.id) : Promise.resolve(null),
    getLatestCheckoutHandoff(account.id),
  ])
  const savedDesign = selectExactSavedCardDesign(
    registration ? { design_id: registration.design_id, payload: registration.design_payload } : null,
    legacyDesign,
  )
  const preferredName = registration
    ? `${registration.first_name} ${registration.last_name}`
    : handoffIdentityName(legacyDesign?.payload)
  const [profile, presentation] = await Promise.all([
    getOwnProfile(account, preferredName),
    getOwnProfilePresentation(account.id),
  ])
  return <div className="dashboard-v6-shell">
    {feedback ? <p className="dashboard-linkedin-feedback" role={feedback.role} aria-live={feedback.role === 'alert' ? 'assertive' : 'polite'}>{feedback.message}</p> : null}
    <ProfileEditor profile={profile} presentation={presentation} savedDesign={savedDesign} saveProfileAction={saveProfileDraft} publishAction={publishProfile} unpublishAction={unpublishProfile} uploadPhotoAction={uploadProfilePhoto} deletePhotoAction={deleteProfilePhoto} linkedinConfigured={isLinkedInImportConfigured()} siteUrl={getPublicEnv().siteUrl} />
  </div>
}
