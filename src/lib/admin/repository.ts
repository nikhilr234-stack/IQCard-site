import { createAdminClient } from '@/lib/supabase/admin'

export type AdminClient = {
  id: string
  email: string
  created_at: string
  profile: { id: string; slug: string; status: 'draft' | 'published'; full_name: string; updated_at: string } | null
}

export async function listAdminClients(): Promise<AdminClient[]> {
  const supabase = createAdminClient()
  const [{ data: accounts, error: accountsError }, { data: profiles, error: profilesError }] = await Promise.all([
    supabase.from('user_accounts').select('id,email,created_at').eq('role', 'client').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,owner_id,slug,status,full_name,updated_at'),
  ])
  if (accountsError || profilesError) throw new Error('Unable to load clients.')
  const profileByOwner = new Map((profiles ?? []).map((profile) => [profile.owner_id, profile]))
  return (accounts ?? []).map((account) => ({ ...account, profile: profileByOwner.get(account.id) ?? null })) as AdminClient[]
}
