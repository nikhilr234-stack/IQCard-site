import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentAccount } from '@/lib/auth/account'
import { getLatestClaimedRegistrationIntent } from '@/lib/registration/repository'
import { getLatestCheckoutHandoff } from '@/lib/checkout/repository'
import { selectExactSavedCardDesign } from '@/lib/dashboard/saved-card'
import { isOnboardingV2Enabled } from '@/lib/features'
import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalizeCardPayload } from '@/lib/customizer/card-configuration'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }

export async function GET(request: NextRequest) {
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Sign in to view your saved card.' }, { status: 401, headers })
    const [registration, handoff] = await Promise.all([
      isOnboardingV2Enabled() ? getLatestClaimedRegistrationIntent(account.id) : Promise.resolve(null), getLatestCheckoutHandoff(account.id),
    ])
    const saved = selectExactSavedCardDesign(registration ? { design_id: registration.design_id, payload: registration.design_payload } : null, handoff)
    const requested = request.nextUrl.searchParams.get('design')
    const card = saved && canonicalizeCardPayload(saved.payload)
    if (!saved || !card || (requested && requested !== saved.design_id)) {
      return NextResponse.json({ error: 'Your saved card could not be found. Return to your dashboard.' }, { status: 404, headers })
    }
    return NextResponse.json({ id: saved.design_id, configuration: card.configuration }, { headers })
  } catch {
    return NextResponse.json({ error: 'Your saved card is temporarily unavailable. Please try again.' }, { status: 503, headers })
  }
}

export async function PUT(request: NextRequest) {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403, headers })
  try {
    const account = await getCurrentAccount()
    if (!account) return NextResponse.json({ error: 'Sign in to save your card.' }, { status: 401, headers })
    let body: { id?: unknown; payload?: unknown }
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid card design.' }, { status: 400, headers }) }
    const card = canonicalizeCardPayload(body?.payload)
    if (typeof body?.id !== 'string' || !card) return NextResponse.json({ error: 'Invalid card design.' }, { status: 400, headers })
    const [registration, handoff] = await Promise.all([isOnboardingV2Enabled() ? getLatestClaimedRegistrationIntent(account.id) : Promise.resolve(null), getLatestCheckoutHandoff(account.id)])
    const isRegistration = registration?.design_id === body.id
    if (!isRegistration && handoff?.design_id !== body.id) return NextResponse.json({ error: 'Your saved card could not be found.' }, { status: 404, headers })
    let update = createAdminClient().from(isRegistration ? 'registration_intents' : 'checkout_handoffs')
      .update(isRegistration ? { design_payload: card } : { payload: card })
      .eq('owner_id', account.id).eq('design_id', body.id)
    update = isRegistration ? update.eq('id', registration!.id).eq('status', 'claimed') : update.eq('token', handoff!.token)
    const { data, error } = await update.select('design_id').maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Your saved card could not be found.' }, { status: 404, headers })
    return NextResponse.json({ id: body.id, configuration: card.configuration }, { headers })
  } catch {
    return NextResponse.json({ error: 'Your dashboard card could not be saved. Please try again.' }, { status: 503, headers })
  }
}
