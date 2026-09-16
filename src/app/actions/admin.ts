'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdminAccount } from '@/lib/auth/account'
import { getPublicEnv } from '@/lib/env'
import { ensureClientProvisioned } from '@/lib/admin/onboarding'
import { validateClientEmail, validateClientSegment } from '@/lib/admin/validation'
import { createAdminClient } from '@/lib/supabase/admin'

export async function onboardClient(formData: FormData) {
  await requireAdminAccount()
  const emailResult = validateClientEmail(String(formData.get('email') ?? ''))
  if (!emailResult.ok) redirect('/admin?error=invalid-email')
  const email = emailResult.value
  const fullName = String(formData.get('full_name') ?? '').trim() || email.split('@')[0]
  const segmentResult = validateClientSegment(String(formData.get('segment') ?? '').trim() || 'Unassigned')
  if (!segmentResult.ok) redirect('/admin?error=invalid-segment')
  const admin = createAdminClient()
  const result = await ensureClientProvisioned({ email, fullName, redirectTo: `${getPublicEnv().siteUrl}/auth/callback` }, {
    async listAuthUsers(page, perPage) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
      return { users: data.users, error }
    },
    async inviteAuthUser(clientEmail, redirectTo) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(clientEmail, { redirectTo })
      return { user: data.user, error }
    },
    async upsertAccount(account) {
      const { error } = await admin.from('user_accounts').upsert(account, { onConflict: 'id', ignoreDuplicates: true })
      return { error }
    },
    async findAccountById(ownerId) {
      const { data, error } = await admin.from('user_accounts').select('role').eq('id', ownerId).maybeSingle()
      return { account: data, error }
    },
    async findProfileByOwner(ownerId) {
      const { data, error } = await admin.from('profiles').select('id').eq('owner_id', ownerId).maybeSingle()
      return { profile: data, error }
    },
    async profileSlugExists(slug) {
      const { data, error } = await admin.from('profiles').select('id').eq('slug', slug).maybeSingle()
      return { exists: Boolean(data), error }
    },
    async createProfile(profile) {
      const { error } = await admin.rpc('admin_create_profile_draft', {
        p_owner_id: profile.owner_id,
        p_slug: profile.slug,
        p_full_name: profile.full_name,
        p_email: profile.email,
      })
      return { error }
    },
  })
  if (!result.ok) redirect(`/admin?error=${result.code}`)
  const { error: metadataError } = await admin.from('client_admin_metadata').upsert({
    owner_id: result.userId,
    segment: segmentResult.value,
    invite_sent_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' })
  if (metadataError) throw new Error('Unable to update client invitation metadata.')
  revalidatePath('/admin')
}

export async function resendClientInvite(formData: FormData) {
  await requireAdminAccount()
  const id = String(formData.get('client_id') ?? '')
  if (!id) throw new Error('Client is required.')
  const admin = createAdminClient()
  const { data: account, error: accountError } = await admin.from('user_accounts').select('email').eq('id', id).eq('role', 'client').single()
  if (accountError || !account) redirect('/admin?error=client-not-found')
  const { error } = await admin.auth.admin.inviteUserByEmail(account.email, { redirectTo: `${getPublicEnv().siteUrl}/auth/callback` })
  if (error) redirect('/admin?error=invite-failed')
  const { error: metadataError } = await admin.from('client_admin_metadata').upsert({
    owner_id: id,
    invite_sent_at: new Date().toISOString(),
  }, { onConflict: 'owner_id' })
  if (metadataError) throw new Error('Unable to update client invitation metadata.')
  revalidatePath('/admin')
}

export async function updateClientSegment(formData: FormData) {
  await requireAdminAccount()
  const id = String(formData.get('client_id') ?? '')
  if (!id) throw new Error('Client is required.')
  const segmentResult = validateClientSegment(String(formData.get('segment') ?? ''))
  if (!segmentResult.ok) throw new Error(segmentResult.error)
  const admin = createAdminClient()
  const { error } = await admin.from('client_admin_metadata').upsert({
    owner_id: id,
    segment: segmentResult.value,
  }, { onConflict: 'owner_id' })
  if (error) throw new Error('Unable to update client segment.')
  revalidatePath('/admin')
}

export async function setClientPublication(formData: FormData) {
  await requireAdminAccount()
  const profileId = String(formData.get('profile_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!profileId || !['draft', 'published'].includes(status)) throw new Error('Invalid profile status.')
  const admin = createAdminClient()
  const { data: slug, error } = await admin.rpc('admin_set_profile_publication', {
    p_profile_id: profileId,
    p_publish: status === 'published',
  })
  if (error || typeof slug !== 'string' || !slug) throw new Error('Unable to update profile status.')
  revalidatePath('/admin'); revalidatePath(`/${slug}`)
}

export async function setClientPublicationForClient(formData: FormData) {
  await requireAdminAccount()
  const clientId = String(formData.get('client_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!clientId || !['draft', 'published'].includes(status)) throw new Error('Invalid profile status.')
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles').select('id').eq('owner_id', clientId).maybeSingle()
  if (profileError || !profile?.id) throw new Error('Client profile not found.')
  const { data: slug, error } = await admin.rpc('admin_set_profile_publication', {
    p_profile_id: profile.id,
    p_publish: status === 'published',
  })
  if (error || typeof slug !== 'string' || !slug) throw new Error('Unable to update profile status.')
  revalidatePath('/admin')
  revalidatePath(`/${slug}`)
}
