import { describe, expect, it } from 'vitest'
import { ensureClientProvisioned, type ClientProvisioningDependencies } from './onboarding'

type FakeState = {
  users: Array<{ id: string; email?: string }>
  accounts: Map<string, { id: string; email: string; role: string }>
  profiles: Map<string, { id: string; owner_id: string; slug: string }>
  takenSlugs: Set<string>
  inviteCount: number
  profileWriteCount: number
}

function fakeDependencies(initial?: Partial<FakeState>) {
  const state: FakeState = {
    users: [],
    accounts: new Map(),
    profiles: new Map(),
    takenSlugs: new Set(),
    inviteCount: 0,
    profileWriteCount: 0,
    ...initial,
  }

  const dependencies: ClientProvisioningDependencies = {
    async listAuthUsers(page, perPage) {
      const start = (page - 1) * perPage
      return { users: state.users.slice(start, start + perPage), error: null }
    },
    async inviteAuthUser(email) {
      state.inviteCount += 1
      const user = { id: `user-${state.users.length + 1}`, email }
      state.users.push(user)
      return { user, error: null }
    },
    async upsertAccount(account) {
      if (!state.accounts.has(account.id)) state.accounts.set(account.id, account)
      return { error: null }
    },
    async findAccountById(ownerId) {
      return { account: state.accounts.get(ownerId) ?? null, error: null }
    },
    async findProfileByOwner(ownerId) {
      return { profile: state.profiles.get(ownerId) ?? null, error: null }
    },
    async profileSlugExists(slug) {
      const exists = state.takenSlugs.has(slug) || [...state.profiles.values()].some((profile) => profile.slug === slug)
      return { exists, error: null }
    },
    async createProfile(profile) {
      state.profileWriteCount += 1
      if (!state.profiles.has(profile.owner_id)) {
        state.profiles.set(profile.owner_id, { id: `profile-${state.profiles.size + 1}`, owner_id: profile.owner_id, slug: profile.slug })
        state.takenSlugs.add(profile.slug)
      }
      return { error: null }
    },
  }

  return { state, dependencies }
}

const input = {
  email: '  CLIENT@Example.com ',
  fullName: 'Client Name',
  redirectTo: 'https://iqcard.example/auth/callback',
}

describe('admin client provisioning retries', () => {
  it('recovers an existing invited Auth user without sending a duplicate invite', async () => {
    const { state, dependencies } = fakeDependencies({ users: [{ id: 'existing-user', email: 'client@example.com' }] })

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toMatchObject({ ok: true, userId: 'existing-user', identity: 'existing', profile: 'created' })
    expect(state.inviteCount).toBe(0)
    expect(state.accounts.get('existing-user')).toEqual({ id: 'existing-user', email: 'client@example.com', role: 'client' })
  })

  it('creates only the missing profile when the Auth user and account already exist', async () => {
    const { state, dependencies } = fakeDependencies({
      users: [{ id: 'existing-user', email: 'client@example.com' }],
      accounts: new Map([['existing-user', { id: 'existing-user', email: 'client@example.com', role: 'client' }]]),
    })

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toMatchObject({ ok: true, userId: 'existing-user', profile: 'created' })
    expect(state.profiles.get('existing-user')).toMatchObject({ owner_id: 'existing-user', slug: 'client-name' })
    expect(state.profileWriteCount).toBe(1)
  })

  it('is idempotent across repeated successful provisioning attempts', async () => {
    const { state, dependencies } = fakeDependencies()

    const first = await ensureClientProvisioned(input, dependencies)
    const second = await ensureClientProvisioned(input, dependencies)

    expect(first).toMatchObject({ ok: true, identity: 'invited', profile: 'created' })
    expect(second).toMatchObject({ ok: true, identity: 'existing', profile: 'existing' })
    expect(state.inviteCount).toBe(1)
    expect(state.accounts).toHaveLength(1)
    expect(state.profiles).toHaveLength(1)
    expect(state.profileWriteCount).toBe(1)
  })

  it('generates a reserved-safe slug for a missing profile', async () => {
    const { state, dependencies } = fakeDependencies({ users: [{ id: 'admin-user', email: 'admin@example.com' }] })

    const result = await ensureClientProvisioned({ ...input, email: 'admin@example.com', fullName: 'Admin' }, dependencies)

    expect(result).toMatchObject({ ok: true, profile: 'created' })
    expect(state.profiles.get('admin-user')?.slug).toBe('admin-2')
  })

  it('returns a structured code when account recovery fails', async () => {
    const { dependencies } = fakeDependencies({ users: [{ id: 'existing-user', email: 'client@example.com' }] })
    dependencies.upsertAccount = async () => ({ error: new Error('database error') })

    await expect(ensureClientProvisioned(input, dependencies)).resolves.toEqual({ ok: false, code: 'account-failed' })
  })

  it('finds an existing identity on a later Auth page', async () => {
    const { state, dependencies } = fakeDependencies()
    dependencies.listAuthUsers = async (page) => page === 1
      ? { users: Array.from({ length: 1_000 }, (_, index) => ({ id: `page-1-${index}`, email: `page-1-${index}@example.com` })), error: null }
      : { users: [{ id: 'target-user', email: 'CLIENT@example.com' }], error: null }

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toMatchObject({ ok: true, userId: 'target-user', identity: 'existing' })
    expect(state.inviteCount).toBe(0)
  })

  it('fails closed after ten full Auth pages with no matching identity', async () => {
    const { state, dependencies } = fakeDependencies()
    let pagesRead = 0
    dependencies.listAuthUsers = async (page) => {
      pagesRead += 1
      return {
        users: Array.from({ length: 1_000 }, (_, index) => ({ id: `page-${page}-${index}`, email: `page-${page}-${index}@example.com` })),
        nextPage: null,
        error: null,
      }
    }

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toEqual({ ok: false, code: 'auth-lookup-limit' })
    expect(pagesRead).toBe(10)
    expect(state.inviteCount).toBe(0)
  })

  it('never demotes an existing administrator account', async () => {
    const { state, dependencies } = fakeDependencies({
      users: [{ id: 'admin-user', email: 'client@example.com' }],
      accounts: new Map([['admin-user', { id: 'admin-user', email: 'client@example.com', role: 'admin' }]]),
    })

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toEqual({ ok: false, code: 'account-role-conflict' })
    expect(state.accounts.get('admin-user')?.role).toBe('admin')
    expect(state.profileWriteCount).toBe(0)
  })

  it('allocates slugs with database-side checks even when a prior slug listing would be truncated', async () => {
    const { state, dependencies } = fakeDependencies({
      users: [{ id: 'existing-user', email: 'client@example.com' }],
      takenSlugs: new Set(['client-name', 'client-name-2']),
    })

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toMatchObject({ ok: true, profile: 'created' })
    expect(state.profiles.get('existing-user')?.slug).toBe('client-name-3')
  })

  it('retries with a new database-checked slug after an insert-time unique conflict', async () => {
    const { state, dependencies } = fakeDependencies({ users: [{ id: 'existing-user', email: 'client@example.com' }] })
    const writeProfile = dependencies.createProfile
    let writes = 0
    dependencies.createProfile = async (profile) => {
      writes += 1
      if (writes === 1) return { error: { code: '23505', message: 'duplicate key value violates unique constraint profiles_slug_key' } }
      return writeProfile(profile)
    }

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toMatchObject({ ok: true, profile: 'created' })
    expect(state.profiles.get('existing-user')?.slug).toBe('client-name-2')
    expect(writes).toBe(2)
  })

  it('recovers when a concurrent invite creates the identity before returning a duplicate error', async () => {
    const { state, dependencies } = fakeDependencies()
    let lookups = 0
    dependencies.listAuthUsers = async () => {
      lookups += 1
      return { users: lookups === 1 ? [] : state.users, error: null }
    }
    dependencies.inviteAuthUser = async (email) => {
      state.inviteCount += 1
      state.users.push({ id: 'concurrent-user', email })
      return { user: null, error: { code: 'email_exists' } }
    }

    const result = await ensureClientProvisioned(input, dependencies)

    expect(result).toMatchObject({ ok: true, userId: 'concurrent-user', identity: 'existing', profile: 'created' })
    expect(state.inviteCount).toBe(1)
    expect(lookups).toBe(2)
  })
})
