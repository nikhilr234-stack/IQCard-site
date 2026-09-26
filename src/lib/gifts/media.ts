import { createAdminClient } from '@/lib/supabase/admin'
import { isProfilePhotoContentType, validateProfilePhoto } from '@/lib/profile/photo'

export type GiftMediaFiles = {
  portrait: File | null
  cover: File | null
}

export type UploadedGiftMedia = {
  photoPath: string | null
  coverPath: string | null
  uploadedPaths: string[]
}

const extensionByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const profileIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateMediaFiles(files: GiftMediaFiles) {
  for (const file of [files.portrait, files.cover]) {
    if (!file) continue
    const validation = validateProfilePhoto(file)
    if (!validation.ok) throw new Error(validation.error)
  }
}

async function removeGiftMedia(storage: ReturnType<typeof createAdminClient>['storage'], paths: string[]) {
  if (!paths.length) return
  try {
    const { error } = await storage.from('gift-media').remove(paths)
    if (error) console.error('[gift-media] cleanup failed', { count: paths.length })
  } catch {
    console.error('[gift-media] cleanup failed', { count: paths.length })
  }
}

export async function cleanupGiftMedia(paths: string[]): Promise<void> {
  if (!paths.length) return
  await removeGiftMedia(createAdminClient().storage, paths)
}

export async function uploadGiftMedia(profileId: string, files: GiftMediaFiles): Promise<UploadedGiftMedia> {
  if (!profileIdPattern.test(profileId)) throw new Error('Invalid gift profile')
  validateMediaFiles(files)

  const storage = createAdminClient().storage
  const uploadedPaths: string[] = []
  let photoPath: string | null = null
  let coverPath: string | null = null

  try {
    for (const [asset, file] of [['portrait', files.portrait], ['cover', files.cover]] as const) {
      if (!file) continue
      const extension = extensionByType[file.type]
      if (!isProfilePhotoContentType(file.type) || !extension) throw new Error('Use a JPEG, PNG, or WebP image.')

      const path = `gift/${profileId}/${asset}-${crypto.randomUUID()}.${extension}`
      const { data, error } = await storage.from('gift-media').upload(path, new Uint8Array(await file.arrayBuffer()), {
        contentType: file.type,
        upsert: false,
        cacheControl: '0',
      })
      if (error || !data) throw new Error('Unable to upload gift media')

      const storedPath = data.path
      if (typeof storedPath === 'string') uploadedPaths.push(storedPath)
      if (typeof storedPath !== 'string' || storedPath !== path) throw new Error('Unable to upload gift media')
      if (asset === 'portrait') photoPath = storedPath
      else coverPath = storedPath
    }
  } catch (error) {
    await removeGiftMedia(storage, uploadedPaths)
    if (error instanceof Error && error.message === 'Use a JPEG, PNG, or WebP image.') throw error
    throw new Error('Unable to upload gift media')
  }

  return { photoPath, coverPath, uploadedPaths }
}
