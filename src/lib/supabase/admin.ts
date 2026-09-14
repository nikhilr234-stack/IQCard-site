import { createClient } from '@supabase/supabase-js'
import { getPublicEnv, getServiceRoleKey } from '@/lib/env'

export function createAdminClient() {
  const environment = getPublicEnv()
  return createClient(environment.supabaseUrl, getServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
