import { NextResponse } from 'next/server'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { confirmPaidOrderProfileForOwner, getOwnProfileDestination } from '@/lib/orders/repository'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ orderId: string }> }
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

export async function POST(request: Request, context: RouteContext) {
  if (!request.headers.get('origin') || request.headers.get('origin') !== new URL(request.url).origin) {
    return json(403, { ok: false, code: 'invalid-origin' })
  }

  let account
  try {
    account = await getVerifiedCurrentAccount()
  } catch {
    return json(503, { ok: false, code: 'account-unavailable' })
  }
  if (!account) return json(401, { ok: false, code: 'sign-in-required' })

  const { orderId } = await context.params
  if (!uuidPattern.test(orderId)) return json(404, { ok: false, code: 'order-not-found' })

  try {
    const destination = await getOwnProfileDestination(account.id)
    if (!destination || destination.status !== 'published') return json(409, { ok: false, code: 'profile-not-ready' })
    const result = await confirmPaidOrderProfileForOwner(orderId, account.id)
    if (result.outcome === 'not_found') return json(404, { ok: false, code: 'order-not-found' })
    if (result.outcome === 'not_available') return json(409, { ok: false, code: 'profile-confirmation-unavailable' })
    if (result.outcome === 'profile_not_ready') return json(409, { ok: false, code: 'profile-not-ready' })
    if (result.outcome !== 'confirmed' || result.profileId !== destination.id || result.profileSlug !== destination.slug) {
      return json(409, { ok: false, code: 'profile-confirmation-unavailable' })
    }
    return json(200, { ok: true, profileId: result.profileId, profileSlug: result.profileSlug })
  } catch {
    console.error('[orders] NFC destination confirmation failed', { code: 'profile-confirmation-unavailable' })
    return json(503, { ok: false, code: 'profile-confirmation-unavailable' })
  }
}
