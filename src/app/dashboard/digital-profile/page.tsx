import { deleteProfileCover, uploadProfileCover } from '@/app/actions/profile-cover'
import { deleteProfilePhoto, uploadProfilePhoto } from '@/app/actions/profile-photo'
import { publishPresentation, savePresentationDraft } from '@/app/actions/presentation'
import { saveProfileLinks } from '@/app/actions/profile-links'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getOwnProfile, getOwnProfilePresentation } from '@/lib/profile/repository'
import { DigitalProfileEditor } from './digital-profile-editor'

export const dynamic = 'force-dynamic'

export default async function DigitalProfilePage() {
  const account = await requireAuthenticatedAccount()
  const [profile, presentation] = await Promise.all([
    getOwnProfile(account),
    getOwnProfilePresentation(account.id),
  ])

  return <DigitalProfileEditor
    profile={profile}
    presentation={presentation}
    saveDraftAction={savePresentationDraft}
    publishAction={publishPresentation}
    uploadCoverAction={uploadProfileCover}
    deleteCoverAction={deleteProfileCover}
    uploadPhotoAction={uploadProfilePhoto}
    deletePhotoAction={deleteProfilePhoto}
    saveLinksAction={saveProfileLinks}
  />
}
