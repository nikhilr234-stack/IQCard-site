import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getPublicEnv } from '@/lib/env'

export async function createServerClient() {
  const cookieStore = await cookies()
  const environment = getPublicEnv()

  return createSupabaseServerClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (entries) => {
        try {
          entries.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Components cannot write cookies; the proxy refreshes sessions instead.
        }
      },
    },
  })
}

// Public profile reads never need a visitor's session. Keeping them free of
// request cookies allows Next to cache the rendered public route safely.
export function createPublicClient() {
  const environment = getPublicEnv()
  return createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
