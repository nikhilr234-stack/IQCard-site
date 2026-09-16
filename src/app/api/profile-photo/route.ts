import { createServerClient } from '@/lib/supabase/server'

const noStoreHeaders = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
}

const publicImageHeaders = {
  'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
}

const profilePhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

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
  const path = new URL(request.url).searchParams.get('path')
  if (!validObjectPath(path)) return notFoundResponse()

  const supabase = await createServerClient()
  const { data, error } = await supabase.storage.from('profile-images').download(path)
  if (error || !data) return notFoundResponse()
  const contentType = profilePhotoTypes.has(data.type) ? data.type : 'application/octet-stream'

  return new Response(data, {
    headers: {
      ...publicImageHeaders,
      'Content-Disposition': contentType === 'application/octet-stream' ? 'attachment' : 'inline',
      'Content-Type': contentType,
    },
  })
}
