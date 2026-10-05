import { createAdminClient } from '@/lib/supabase/admin'
import type { Client, ClientStatus } from '@/features/admin/types'

type AccountRow = { id: string; email: string; created_at: string }
type ProfileRow = { owner_id: string; slug: string; status: 'draft' | 'published'; full_name: string | null }
type ProgressRow = { owner_id: string; current_step: string | null; completed_steps: string[] | null; started_at: string | null; completed_at: string | null }
type MetadataRow = { owner_id: string; segment: string | null; invite_sent_at: string | null; invite_opened_at: string | null; last_active_at: string | null }

function profileStatus(profile: ProfileRow | undefined, metadata: MetadataRow | undefined, progress: ProgressRow | undefined): ClientStatus {
  if (profile?.status === 'published') return 'Live'
  if (profile && progress?.completed_at) return 'Review'
  if (profile) return 'Draft'
  return metadata?.invite_sent_at ? 'Invited' : 'No profile'
}

function displayName(account: AccountRow, profile: ProfileRow | undefined) {
  return profile?.full_name?.trim() || account.email.split('@')[0] || account.email
}

const ONBOARDING_STEPS = new Set(['identity', 'contact', 'content', 'address', 'preview', 'publish'])

function completedOnboardingSteps(progress: ProgressRow | undefined) {
  return new Set((progress?.completed_steps ?? []).filter((step) => ONBOARDING_STEPS.has(step)))
}

export async function listAdminClients(): Promise<Client[]> {
  const supabase = createAdminClient()
  const [accountsResult, profilesResult, progressResult, metadataResult] = await Promise.all([
    supabase.from('user_accounts').select('id,email,created_at').eq('role', 'client').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id,owner_id,slug,status,full_name,updated_at'),
    supabase.from('onboarding_progress').select('owner_id,current_step,completed_steps,started_at,completed_at'),
    supabase.from('client_admin_metadata').select('owner_id,segment,invite_sent_at,invite_opened_at,last_active_at'),
  ])
  if (accountsResult.error || profilesResult.error || progressResult.error || metadataResult.error) throw new Error('Unable to load clients.')

  const profiles = profilesResult.data as ProfileRow[] | null
  const progress = progressResult.data as ProgressRow[] | null
  const metadata = metadataResult.data as MetadataRow[] | null
  const profileByOwner = new Map((profiles ?? []).map((profile) => [profile.owner_id, profile]))
  const progressByOwner = new Map((progress ?? []).map((row) => [row.owner_id, row]))
  const metadataByOwner = new Map((metadata ?? []).map((row) => [row.owner_id, row]))

  return ((accountsResult.data as AccountRow[] | null) ?? []).map((account) => {
    const profile = profileByOwner.get(account.id)
    const onboarding = progressByOwner.get(account.id)
    const adminMetadata = metadataByOwner.get(account.id)
    const completedSteps = completedOnboardingSteps(onboarding)
    const hasMeaningfulProgress = Boolean(profile) || completedSteps.size > 0 || (onboarding?.current_step !== null && onboarding?.current_step !== undefined && onboarding.current_step !== 'identity')
    return {
      id: account.id,
      name: displayName(account, profile),
      email: account.email,
      status: profileStatus(profile, adminMetadata, onboarding),
      profileUrl: profile?.slug ? `/${profile.slug}` : null,
      joinedAt: account.created_at,
      completion: Math.min(100, Math.max(0, (completedSteps.size / ONBOARDING_STEPS.size) * 100)),
      lastActiveAt: adminMetadata?.last_active_at ?? null,
      segment: adminMetadata?.segment?.trim() || 'Unassigned',
      inviteOpened: Boolean(adminMetadata?.invite_opened_at),
      startedProfile: hasMeaningfulProgress,
      completedProfile: Boolean(onboarding?.completed_at || completedSteps.size === ONBOARDING_STEPS.size),
    }
  })
}
