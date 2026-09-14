import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { getPublicEnv } from '@/lib/env'

export async function updateSession(request: NextRequest): Promise<{ response: NextResponse; user: User | null }> {
  const environment = getPublicEnv()
  let response = NextResponse.next({ request })
  const supabase = createServerClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (entries) => {
        entries.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        entries.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  return { response, user }
}
