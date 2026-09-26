import { createAdminClient } from '@/lib/supabase/admin'
import { validateSlug } from '@/lib/profile/validation'

export const dynamic = 'force-dynamic'

const privateHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
}

const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

function notFoundResponse() {
  return new Response('Not found', { status: 404, headers: privateHeaders })
}

function isGiftPath(profileId: string, path: unknown): path is string {
  if (typeof path !== 'string' || path.length > 512 || path.includes('\\')) return false
  const segments = path.split('/')
  return segments.length === 3
    && segments[0] === 'gift'
    && segments[1] === profileId
    && segments[2] !== ''
    && !segments[2].includes('..')
}

function publishedCoverPath(value: unknown): unknown {
  if (!value || typeof value !== 'object') return null
  const published = (value as Record<string, unknown>).published
  if (!published || typeof published !== 'object') return null
  const presentation = published as Record<string, unknown>
  if (presentation.template !== 'cover' || !presentation.cover || typeof presentation.cover !== 'object') return null
  return (presentation.cover as Record<string, unknown>).coverPath
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get('slug')
  const asset = url.searchParams.get('asset')
  if (!slug || validateSlug(slug) || (asset !== 'portrait' && asset !== 'cover')) return notFoundResponse()

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, photo_path')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()
  if (profileError || !profile?.id) return notFoundResponse()

  let path: unknown = profile.photo_path
  if (asset === 'cover') {
    const { data: presentation, error } = await admin
      .from('profile_presentations')
      .select('published')
      .eq('profile_id', profile.id)
      .maybeSingle()
    if (error || !presentation) return notFoundResponse()
    path = publishedCoverPath(presentation)
  }

  if (!isGiftPath(profile.id, path)) return notFoundResponse()
  const { data, error } = await admin.storage.from('gift-media').download(path)
  if (error || !data) return notFoundResponse()

  const contentType = imageTypes.has(data.type) ? data.type : 'application/octet-stream'
  return new Response(data, {
    headers: {
      ...privateHeaders,
      'Content-Disposition': contentType === 'application/octet-stream' ? 'attachment' : 'inline',
      'Content-Type': contentType,
    },
  })
}
