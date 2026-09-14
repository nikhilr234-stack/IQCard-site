'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { normalizePresentation } from '@/lib/profile/presentation'
import { validateProfilePhoto } from '@/lib/profile/photo'
import { createServerClient } from '@/lib/supabase/server'

type ProfileCoverClient = Awaited<ReturnType<typeof createServerClient>>

async function removeCoverBestEffort(supabase: ProfileCoverClient, path: string, message: string) {
  try {
    const { error } = await supabase.storage.from('profile-covers').remove([path])
    if (error) console.error(message, error)
  } catch (error) {
    console.error(message, error)
  }
}

async function getOwnPresentation(supabase: ProfileCoverClient, ownerId: string) {
  const { data, error } = await supabase
    .from('profile_presentations')
    .select('draft, published, profiles!inner(owner_id)')
    .eq('profiles.owner_id', ownerId)
    .maybeSingle()

  if (error) throw new Error('Unable to load your presentation.')
  if (data === null) return normalizePresentation({})
  if (!data) throw new Error('Unable to load your presentation.')
  return normalizePresentation(data)
}

async function removeCoverIfNotPublished(supabase: ProfileCoverClient, ownerId: string, path: string, message: string) {
  try {
    const latestPresentation = await getOwnPresentation(supabase, ownerId)
    if (latestPresentation.published.cover.coverPath === path) return
    await removeCoverBestEffort(supabase, path, message)
  } catch (error) {
    console.error('Profile cover cleanup state check failed.', error)
  }
}

function revalidateProfileCover() {
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/digital-profile')
}

export async function uploadProfileCover(formData: FormData) {
  const account = await requireAuthenticatedAccount()
  const file = formData.get('cover')
  const validation = validateProfilePhoto(file)
  if (!validation.ok) throw new Error(validation.error)
  if (!(file instanceof File)) throw new Error('Choose a photo first.')

  const supabase = await createServerClient()
  const presentation = await getOwnPresentation(supabase, account.id)
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const coverPath = `${account.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from('profile-covers')
    .upload(coverPath, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error('Unable to upload cover.')

  const draft = {
    ...presentation.draft,
    cover: { ...presentation.draft.cover, coverPath },
  }
  const { error: saveError } = await supabase.rpc('save_own_profile_presentation', { p_draft: draft })
  if (saveError) {
    await removeCoverBestEffort(supabase, coverPath, 'Profile cover upload cleanup failed.')
    throw new Error('Unable to save cover.')
  }

  const previousPath = presentation.draft.cover.coverPath
  if (previousPath && previousPath !== coverPath) {
    await removeCoverIfNotPublished(supabase, account.id, previousPath, 'Profile cover replacement cleanup failed.')
  }
  revalidateProfileCover()
  return { coverPath }
}

export async function deleteProfileCover() {
  const account = await requireAuthenticatedAccount()
  const supabase = await createServerClient()
  const presentation = await getOwnPresentation(supabase, account.id)
  const coverPath = presentation.draft.cover.coverPath
  if (!coverPath) return { coverPath: null }

  const draft = {
    ...presentation.draft,
    cover: { ...presentation.draft.cover, coverPath: null },
  }
  const { error: saveError } = await supabase.rpc('save_own_profile_presentation', { p_draft: draft })
  if (saveError) throw new Error('Unable to remove cover.')

  await removeCoverIfNotPublished(supabase, account.id, coverPath, 'Profile cover deletion cleanup failed.')
  revalidateProfileCover()
  return { coverPath: null }
}
