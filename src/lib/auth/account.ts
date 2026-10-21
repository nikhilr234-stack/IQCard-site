import { redirect } from 'next/navigation'
import { getAdminEmails } from '@/lib/env'
import { isAdminEmail, roleForEmail, type UserRole } from '@/lib/auth/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@/lib/supabase/server'

export type CurrentAccount = {
  id: string
  email: string
  role: UserRole
}

async function promoteAdministratorIfAllowed(id: string, email: string) {
  if (!isAdminEmail(email, getAdminEmails())) return

  const { error } = await createAdminClient()
    .from('user_accounts')
    .upsert({ id, email: email.toLowerCase(), role: 'admin' })

  if (error) throw new Error('Unable to initialize administrator access')
}

async function createMissingAccount(id: string, email: string): Promise<CurrentAccount> {
  const normalizedEmail = email.trim().toLowerCase()
  const role = roleForEmail(normalizedEmail, getAdminEmails())
  const { data, error } = await createAdminClient()
    .from('user_accounts')
    .upsert({ id, email: normalizedEmail, role }, { onConflict: 'id' })
    .select('role')
    .single()

  if (error || !data) throw new Error('Unable to initialize your account')
  return { id, email, role: data.role as UserRole }
}

export async function getCurrentAccount(): Promise<CurrentAccount | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return resolveAccount(user, supabase)
}

export async function getVerifiedCurrentAccount(): Promise<CurrentAccount | null> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email || !user.email_confirmed_at) return null
  return resolveAccount(user, supabase)
}

async function resolveAccount(user: { id: string; email?: string; email_confirmed_at?: string | null } | null, supabase: Awaited<ReturnType<typeof createServerClient>>): Promise<CurrentAccount | null> {
  if (!user?.email) return null

  await promoteAdministratorIfAllowed(user.id, user.email)

  const { data, error } = await supabase
    .from('user_accounts')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (error) throw new Error('Unable to load account')
  if (!data) return createMissingAccount(user.id, user.email)

  return { id: user.id, email: user.email, role: data.role as UserRole }
}

export async function requireAuthenticatedAccount(): Promise<CurrentAccount> {
  const account = await getCurrentAccount()
  if (!account) redirect('/login')
  return account
}

export async function requireAdminAccount(): Promise<CurrentAccount> {
  const account = await requireAuthenticatedAccount()
  if (account.role !== 'admin') redirect('/dashboard?error=admin-only')
  return account
}

export async function requireVerifiedAdminAccount(): Promise<CurrentAccount> {
  const account = await getVerifiedCurrentAccount()
  if (!account) redirect('/login?next=%2Fadmin')
  if (account.role !== 'admin') redirect('/dashboard?error=admin-only')
  return account
}
