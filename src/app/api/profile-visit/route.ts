import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return new Response(null, { status: 403 })
  if (/bot|crawler|spider|preview|headless/i.test(request.headers.get('user-agent') ?? '')) return new Response(null, { status: 204 })
  try {
    const raw = await request.text()
    if (raw.length > 2048) return new Response(null, { status: 413 })
    const { slug, visitor, event, linkId } = JSON.parse(raw)
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (typeof slug !== 'string' || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || typeof visitor !== 'string' || !uuid.test(visitor) || !['profile_view','contact_save','link_click'].includes(event) || (event === 'link_click' && (typeof linkId !== 'string' || !uuid.test(linkId)))) return new Response(null, { status: 400 })
    const visitorHash = createHash('sha256').update(slug + ':' + visitor).digest('hex')
    const { error } = await createAdminClient().rpc('record_public_profile_event', { p_slug: slug, p_event_type: event, p_link_id: event === 'link_click' ? linkId : null, p_visitor_hash: visitorHash })
    if (error) { console.error('Profile visit recording failed', error.code); return new Response(null, { status: 503 }) }
    return new Response(null, { status: 204 })
  } catch { return new Response(null, { status: 400 }) }
}
