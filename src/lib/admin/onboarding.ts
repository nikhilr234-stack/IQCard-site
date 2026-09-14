import { makeAvailableSlug } from './validation'
import { createDefaultProfileDraft } from '../profile/defaults'

export type ProvisioningAuthUser = { id: string; email?: string }

type DependencyResult<T> = T & { error: unknown | null }

export type ClientProvisioningDependencies = {
  listAuthUsers(page: number, perPage: number): Promise<DependencyResult<{ users: ProvisioningAuthUser[] }>>
  inviteAuthUser(email: string, redirectTo: string): Promise<DependencyResult<{ user: ProvisioningAuthUser | null }>>
  upsertAccount(account: { id: string; email: string; role: 'client' }): Promise<{ error: unknown | null }>
  findAccountById(ownerId: string): Promise<DependencyResult<{ account: { role: string } | null }>>
  findProfileByOwner(ownerId: string): Promise<DependencyResult<{ profile: { id: string } | null }>>
  profileSlugExists(slug: string): Promise<DependencyResult<{ exists: boolean }>>
  createProfile(profile: { owner_id: string } & ReturnType<typeof createDefaultProfileDraft>): Promise<{ error: unknown | null }>
}

export type ClientProvisioningFailureCode =
  | 'auth-lookup-failed'
  | 'auth-lookup-limit'
  | 'invite-failed'
  | 'account-failed'
  | 'account-role-conflict'
  | 'profile-failed'

export type ClientProvisioningResult =
  | { ok: true; userId: string; identity: 'existing' | 'invited'; profile: 'existing' | 'created' }
  | { ok: false; code: ClientProvisioningFailureCode }

export type ClientProvisioningInput = {
  email: string
  fullName: string
  redirectTo: string
}

const AUTH_PAGE_SIZE = 1_000
const MAX_AUTH_PAGES = 10
const MAX_PROFILE_SLUG_ATTEMPTS = 50

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505'
}

async function findAuthUserByEmail(email: string, dependencies: ClientProvisioningDependencies): Promise<
  | { ok: true; user: ProvisioningAuthUser | null }
  | { ok: false; code: 'auth-lookup-failed' | 'auth-lookup-limit' }
> {
  for (let page = 1; page <= MAX_AUTH_PAGES; page += 1) {
    const result = await dependencies.listAuthUsers(page, AUTH_PAGE_SIZE)
    if (result.error) return { ok: false, code: 'auth-lookup-failed' }

    const user = result.users.find((candidate) => candidate.email?.trim().toLowerCase() === email)
    if (user) return { ok: true, user }

    if (result.users.length < AUTH_PAGE_SIZE) return { ok: true, user: null }
  }

  return { ok: false, code: 'auth-lookup-limit' }
}

export async function ensureClientProvisioned(input: ClientProvisioningInput, dependencies: ClientProvisioningDependencies): Promise<ClientProvisioningResult> {
  const email = input.email.trim().toLowerCase()
  const fallbackName = email.split('@')[0] || 'Client'
  const fullName = input.fullName.trim() || fallbackName
  const authSearch = await findAuthUserByEmail(email, dependencies)
  if (!authSearch.ok) return authSearch

  let user = authSearch.user
  let identity: 'existing' | 'invited' = 'existing'

  if (!user) {
    const invitation = await dependencies.inviteAuthUser(email, input.redirectTo)
    if (!invitation.error && invitation.user) {
      user = invitation.user
      identity = 'invited'
    } else {
      const recoverySearch = await findAuthUserByEmail(email, dependencies)
      if (!recoverySearch.ok || !recoverySearch.user) return { ok: false, code: 'invite-failed' }
      user = recoverySearch.user
    }
  }

  const account = await dependencies.upsertAccount({ id: user.id, email, role: 'client' })
  if (account.error) return { ok: false, code: 'account-failed' }
  const storedAccount = await dependencies.findAccountById(user.id)
  if (storedAccount.error || !storedAccount.account) return { ok: false, code: 'account-failed' }
  if (storedAccount.account.role !== 'client') return { ok: false, code: 'account-role-conflict' }

  const existingProfile = await dependencies.findProfileByOwner(user.id)
  if (existingProfile.error) return { ok: false, code: 'profile-failed' }
  if (existingProfile.profile) return { ok: true, userId: user.id, identity, profile: 'existing' }

  const draft = createDefaultProfileDraft(fullName, email)
  const takenCandidates = new Set<string>()

  for (let attempt = 0; attempt < MAX_PROFILE_SLUG_ATTEMPTS; attempt += 1) {
    const slug = makeAvailableSlug(fullName, takenCandidates)
    const slugCheck = await dependencies.profileSlugExists(slug)
    if (slugCheck.error) return { ok: false, code: 'profile-failed' }
    if (slugCheck.exists) {
      takenCandidates.add(slug)
      continue
    }

    const profile = await dependencies.createProfile({ owner_id: user.id, ...draft, slug })
    if (!profile.error) return { ok: true, userId: user.id, identity, profile: 'created' }

    const concurrentProfile = await dependencies.findProfileByOwner(user.id)
    if (concurrentProfile.error) return { ok: false, code: 'profile-failed' }
    if (concurrentProfile.profile) return { ok: true, userId: user.id, identity, profile: 'existing' }
    if (!isUniqueConstraintViolation(profile.error)) return { ok: false, code: 'profile-failed' }
    takenCandidates.add(slug)
  }

  return { ok: false, code: 'profile-failed' }
}
