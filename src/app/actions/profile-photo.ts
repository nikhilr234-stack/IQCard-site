'use server'

import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { validateProfilePhoto } from '@/lib/profile/photo'
import { createServerClient } from '@/lib/supabase/server'

type ProfilePhotoClient = Awaited<ReturnType<typeof createServerClient>>

async function removePhotoBestEffort(supabase: ProfilePhotoClient, path: string, message: string) {
  try {
    const { error } = await supabase.storage.from('profile-images').remove([path])
    if (error) console.error(message, error)
  } catch (error) {
    console.error(message, error)
  }
}

export async function uploadProfilePhoto(formData: FormData) {
  const account = await requireAuthenticatedAccount()
  const file = formData.get('photo')
  const validation = validateProfilePhoto(file)
  if (!validation.ok) throw new Error(validation.error)
  if (!(file instanceof File)) throw new Error('Choose a photo first.')
  const supabase = await createServerClient()
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,slug,photo_path').eq('owner_id', account.id).single()
  if (profileError || !profile) throw new Error('Unable to find your profile.')
  const extension = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
  const path = `${account.id}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('profile-images').upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw new Error('Unable to upload photo.')
  const { error: updateError } = await supabase.from('profiles').update({ photo_path: path }).eq('id', profile.id)
  if (updateError) {
    await removePhotoBestEffort(supabase, path, 'Profile photo upload cleanup failed.')
    throw new Error('Unable to save photo.')
  }
  if (profile.photo_path) {
    await removePhotoBestEffort(supabase, profile.photo_path, 'Profile photo replacement cleanup failed.')
  }
  revalidatePath('/dashboard')
  if (profile.slug) revalidatePath(`/${profile.slug}`)
}

export async function deleteProfilePhoto() {
  const account = await requireAuthenticatedAccount()
  const supabase = await createServerClient()
  const { data: profile, error: profileError } = await supabase.from('profiles').select('id,slug,photo_path').eq('owner_id', account.id).single()
  if (profileError || !profile) throw new Error('Unable to find your profile.')
  const { error } = await supabase.from('profiles').update({ photo_path: null }).eq('id', profile.id)
  if (error) throw new Error('Unable to remove photo.')
  if (profile.photo_path) {
    await removePhotoBestEffort(supabase, profile.photo_path, 'Profile photo deletion cleanup failed.')
  }
  revalidatePath('/dashboard')
  if (profile.slug) revalidatePath(`/${profile.slug}`)
}
