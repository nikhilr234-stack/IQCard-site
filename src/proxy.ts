import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const isProtected = request.nextUrl.pathname.startsWith('/dashboard')
    || request.nextUrl.pathname.startsWith('/admin')
    || request.nextUrl.pathname.startsWith('/onboarding')
  const { response, user } = await updateSession(request)
  if (!isProtected) return response

  if (user) return response

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(loginUrl)
}

export const config = { matcher: ['/dashboard/:path*', '/admin/:path*', '/onboarding/:path*'] }
