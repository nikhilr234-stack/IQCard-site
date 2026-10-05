import { deleteProfileCover, uploadProfileCover } from '@/app/actions/profile-cover'
import { deleteProfilePhoto, uploadProfilePhoto } from '@/app/actions/profile-photo'
import { publishPresentation } from '@/app/actions/presentation'
import { saveDigitalProfile } from '@/app/actions/digital-profile'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getOwnProfile, getOwnProfilePresentation } from '@/lib/profile/repository'
import './digital-profile-editor.css'
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
    canPublish={account.role === 'admin'}
    saveDigitalProfileAction={saveDigitalProfile}
    publishAction={publishPresentation}
    uploadCoverAction={uploadProfileCover}
    deleteCoverAction={deleteProfileCover}
    uploadPhotoAction={uploadProfilePhoto}
    deletePhotoAction={deleteProfilePhoto}
  />
}
