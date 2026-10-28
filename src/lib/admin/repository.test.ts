import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAdminClients } from './repository'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

const accounts = [
  { id: 'live', email: 'live@example.com', created_at: '2026-09-01T00:00:00Z' },
  { id: 'draft', email: 'draft@example.com', created_at: '2026-09-02T00:00:00Z' },
  { id: 'invited', email: 'invite@example.com', created_at: '2026-09-03T00:00:00Z' },
  { id: 'legacy', email: 'legacy@example.com', created_at: '2026-09-04T00:00:00Z' },
]

function query(data: unknown) {
  return { select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data, error: null }) })) })) }
}

function clientWithRows({ profiles = [], progress = [], metadata = [] }: { profiles?: unknown[]; progress?: unknown[]; metadata?: unknown[] }) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'user_accounts') return query(accounts)
      if (table === 'profiles') return { select: vi.fn().mockResolvedValue({ data: profiles, error: null }) }
      if (table === 'onboarding_progress') return { select: vi.fn().mockResolvedValue({ data: progress, error: null }) }
      if (table === 'client_admin_metadata') return { select: vi.fn().mockResolvedValue({ data: metadata, error: null }) }
      throw new Error(`Unexpected table: ${table}`)
    }),
  }
}

describe('listAdminClients', () => {
  beforeEach(() => vi.clearAllMocks())

  it('maps real account, profile, progress, and metadata rows into the dashboard contract', async () => {
    vi.mocked(createAdminClient).mockReturnValue(clientWithRows({
      profiles: [
        { id: 'profile-live', owner_id: 'live', slug: 'live-person', status: 'published', full_name: 'Live Person' },
        { id: 'profile-draft', owner_id: 'draft', slug: 'draft-person', status: 'draft', full_name: 'Draft Person' },
      ],
      progress: [
        { owner_id: 'live', completed_steps: ['identity', 'contact', 'content', 'address', 'preview', 'publish'], started_at: '2026-09-01T00:00:00Z', completed_at: '2026-09-02T00:00:00Z' },
        { owner_id: 'draft', completed_steps: ['identity', 'contact'], started_at: '2026-09-02T00:00:00Z', completed_at: null },
      ],
      metadata: [
        { owner_id: 'live', segment: 'Enterprise', invite_sent_at: '2026-08-31T00:00:00Z', invite_opened_at: '2026-09-01T00:00:00Z', last_active_at: '2026-09-05T00:00:00Z' },
        { owner_id: 'invited', segment: 'New leads', invite_sent_at: '2026-09-03T02:00:00Z', invite_opened_at: null, last_active_at: null },
      ],
    }) as never)

    await expect(listAdminClients()).resolves.toEqual([
      { id: 'live', name: 'Live Person', email: 'live@example.com', status: 'Live', profileUrl: '/live-person', joinedAt: '2026-09-01T00:00:00Z', completion: 100, lastActiveAt: '2026-09-05T00:00:00Z', segment: 'Enterprise', inviteOpened: true, startedProfile: true, completedProfile: true },
      { id: 'draft', name: 'Draft Person', email: 'draft@example.com', status: 'Draft', profileUrl: '/draft-person', joinedAt: '2026-09-02T00:00:00Z', completion: 2 / 6 * 100, lastActiveAt: null, segment: 'Unassigned', inviteOpened: false, startedProfile: true, completedProfile: false },
      { id: 'invited', name: 'invite', email: 'invite@example.com', status: 'Invited', profileUrl: null, joinedAt: '2026-09-03T00:00:00Z', completion: 0, lastActiveAt: null, segment: 'New leads', inviteOpened: false, startedProfile: false, completedProfile: false },
      { id: 'legacy', name: 'legacy', email: 'legacy@example.com', status: 'No profile', profileUrl: null, joinedAt: '2026-09-04T00:00:00Z', completion: 0, lastActiveAt: null, segment: 'Unassigned', inviteOpened: false, startedProfile: false, completedProfile: false },
    ])
  })

  it('marks completed private onboarding profiles as awaiting review', async () => {
    vi.mocked(createAdminClient).mockReturnValue(clientWithRows({
      profiles: [{ id: 'profile-review', owner_id: 'draft', slug: 'ada-lovelace', status: 'draft', full_name: 'Ada Lovelace' }],
      progress: [{ owner_id: 'draft', current_step: 'publish', completed_steps: ['identity', 'contact', 'content', 'address', 'preview', 'publish'], started_at: '2026-09-02T00:00:00Z', completed_at: '2026-10-05T00:00:00Z' }],
    }) as never)

    const clients = await listAdminClients()
    expect(clients.find((client) => client.id === 'draft')).toMatchObject({ status: 'Review', completedProfile: true })
  })

  it('fails as a whole when any canonical source query fails', async () => {
    const client = clientWithRows({})
    vi.mocked(createAdminClient).mockReturnValue({
      ...client,
      from: vi.fn((table: string) => table === 'profiles'
        ? { select: vi.fn().mockResolvedValue({ data: null, error: new Error('profiles unavailable') }) }
        : client.from(table)),
    } as never)

    await expect(listAdminClients()).rejects.toThrow('Unable to load clients.')
  })

  it('does not count a default onboarding row as started and ignores invalid duplicate completion steps', async () => {
    vi.mocked(createAdminClient).mockReturnValue(clientWithRows({
      progress: [
        { owner_id: 'invited', current_step: 'identity', completed_steps: [], started_at: '2026-09-03T00:00:00Z', completed_at: null },
        { owner_id: 'legacy', current_step: 'publish', completed_steps: ['identity', 'identity', 'contact', 'invalid'], started_at: '2026-09-04T00:00:00Z', completed_at: null },
      ],
    }) as never)

    const clients = await listAdminClients()

    expect(clients.find((client) => client.id === 'invited')).toMatchObject({ startedProfile: false, completion: 0 })
    expect(clients.find((client) => client.id === 'legacy')).toMatchObject({ startedProfile: true, completion: 2 / 6 * 100 })
  })
})
