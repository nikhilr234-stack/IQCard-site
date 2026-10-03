import { isProfilePhotoContentType } from '@/lib/profile/photo'
import { createPublicClient, createServerClient } from '@/lib/supabase/server'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
}

const publishedImageHeaders = {
  ...noStoreHeaders,
  'Cache-Control': 'public, max-age=300, s-maxage=300',
}

function notFoundResponse() {
  return new Response('Not found', { status: 404, headers: noStoreHeaders })
}

function validObjectPath(path: string | null): path is string {
  if (!path || path.length > 1024 || path.startsWith('/') || path.includes('\\')) return false
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(path)) return false
  const segments = path.split('/')
  return segments.length >= 2 && segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..')
}

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams
  const path = searchParams.get('path')
  if (!validObjectPath(path)) return notFoundResponse()

  // Published covers are checked by the anonymous Storage RLS policy. That
  // prevents an owner's private draft upload from entering a public cache.
  const published = searchParams.get('published') === '1'
  const supabase = published ? createPublicClient() : await createServerClient()
  const { data, error } = await supabase.storage.from('profile-covers').download(path)
  if (error || !data) return notFoundResponse()
  const contentType = isProfilePhotoContentType(data.type) ? data.type : 'application/octet-stream'

  return new Response(data, {
    headers: {
      ...(published ? publishedImageHeaders : noStoreHeaders),
      'Content-Disposition': contentType === 'application/octet-stream' ? 'attachment' : 'inline',
      'Content-Type': contentType,
    },
  })
}
