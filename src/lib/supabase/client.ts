import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr'
import { getPublicEnv } from '@/lib/env'

export function createBrowserClient() {
  const environment = getPublicEnv()
  return createSupabaseBrowserClient(environment.supabaseUrl, environment.supabaseAnonKey)
}
