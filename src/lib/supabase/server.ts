import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
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
