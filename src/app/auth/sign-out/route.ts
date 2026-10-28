import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  if (request.headers.get('origin') !== origin) {
    return new Response('This sign-out request is not allowed.', { status: 403, headers: { 'Cache-Control': 'no-store' } })
  }

  let destination = '/login'
  try {
    const supabase = await createServerClient()
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) destination = '/auth/sign-out-error'
  } catch {
    destination = '/auth/sign-out-error'
  }

  // A native form navigation discards the old account's client router state.
  const response = NextResponse.redirect(new URL(destination, origin), 303)
  response.headers.set('Cache-Control', 'no-store')
  return response
}
