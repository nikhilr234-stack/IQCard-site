import { getAdminEmails } from '@/lib/env'
import { foundingProfileSlugs } from '@/lib/site-routing'

function emailDraft(profile: string | null, body = '', status = 302) {
  const headers = { 'Cache-Control': 'no-store' }
  if (!foundingProfileSlugs.some((slug) => slug === profile)) {
    return new Response('Profile not found', { status: 404, headers })
  }

  // Keep the original update-request action without embedding the admin
  // address in archived HTML or sending mail on behalf of the visitor.
  const email = getAdminEmails().values().next().value
  if (!email || !/^[^\s@?]+@[^\s@?]+\.[^\s@?]+$/.test(email)) {
    return new Response('Update requests are temporarily unavailable. Please try again later.', { status: 503, headers })
  }
  const subject = encodeURIComponent(`Profile Update Request - ${profile}`)
  const details = body ? `&body=${encodeURIComponent(body)}` : ''
  return new Response(null, {
    status,
    headers: { ...headers, Location: `mailto:${email}?subject=${subject}${details}` },
  })
}

export function GET(request: Request) {
  return emailDraft(new URL(request.url).searchParams.get('profile'))
}

export async function POST(request: Request) {
  if (Number(request.headers.get('content-length')) > 8192) {
    return new Response('Request too large', { status: 413, headers: { 'Cache-Control': 'no-store' } })
  }
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return new Response('Invalid update request', { status: 400, headers: { 'Cache-Control': 'no-store' } })
  }
  const profile = form.get('profile')
  const fields = [
    ['name', 'Name'], ['field_to_update', 'Change requested'],
    ['new_button_text', 'Button text'], ['new_link', 'New link'], ['notes', 'Notes'],
  ]
  const body = fields.flatMap(([key, label]) => {
    const value = form.get(key)
    return typeof value === 'string' && value.trim() ? [`${label}: ${value.trim().slice(0, 500)}`] : []
  }).join('\n')
  return emailDraft(typeof profile === 'string' ? profile : null, body, 303)
}
