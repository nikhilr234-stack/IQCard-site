import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAdminAccount } from '@/lib/auth/account'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureClientProvisioned } from '@/lib/admin/onboarding'
import { onboardClient, resendClientInvite, setClientPublication, setClientPublicationForClient, updateClientSegment } from './admin'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAdminAccount: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/lib/env', () => ({ getPublicEnv: () => ({ siteUrl: 'https://iqcard.example' }) }))
vi.mock('@/lib/admin/onboarding', () => ({ ensureClientProvisioned: vi.fn() }))

describe('admin publication action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdminAccount).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
  })

  it('uses the service-role-only atomic publication RPC without direct profile writes', async () => {
    const directUpdate = vi.fn()
    const directSelect = vi.fn()
    const rpc = vi.fn().mockResolvedValue({ data: 'client-slug', error: null })
    vi.mocked(createAdminClient).mockReturnValue({
      rpc,
      from: vi.fn(() => ({ update: directUpdate, select: directSelect })),
    } as never)
    const form = new FormData()
    form.set('profile_id', 'profile-1')
    form.set('status', 'published')

    await setClientPublication(form)

    expect(rpc).toHaveBeenCalledWith('admin_set_profile_publication', {
      p_profile_id: 'profile-1', p_publish: true,
    })
    expect(directSelect).not.toHaveBeenCalled()
    expect(directUpdate).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/admin')
    expect(revalidatePath).toHaveBeenCalledWith('/client-slug')
  })

  it('fails closed when the atomic admin publication RPC rejects the request', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: new Error('database failure') })
    vi.mocked(createAdminClient).mockReturnValue({ rpc } as never)
    const form = new FormData()
    form.set('profile_id', 'profile-1')
    form.set('status', 'draft')

    await expect(setClientPublication(form)).rejects.toThrow('Unable to update profile status.')
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('admin metadata actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdminAccount).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
  })

  it('updates a client segment after requiring an administrator', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ upsert })) } as never)
    const form = new FormData()
    form.set('client_id', 'client-1')
    form.set('segment', '  Enterprise  ')

    await updateClientSegment(form)

    expect(requireAdminAccount).toHaveBeenCalledOnce()
    expect(upsert).toHaveBeenCalledWith({ owner_id: 'client-1', segment: 'Enterprise' }, { onConflict: 'owner_id' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('rejects invalid segments before opening a database connection', async () => {
    const form = new FormData()
    form.set('client_id', 'client-1')
    form.set('segment', 'x'.repeat(61))

    await expect(updateClientSegment(form)).rejects.toThrow('Client segment must be 60 characters or fewer.')
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('records a resend timestamp in client metadata', async () => {
    const metadataUpsert = vi.fn().mockResolvedValue({ error: null })
    const inviteUserByEmail = vi.fn().mockResolvedValue({ error: null })
    const single = vi.fn().mockResolvedValue({ data: { email: 'client@example.com' }, error: null })
    const eqRole = vi.fn(() => ({ single }))
    const eqId = vi.fn(() => ({ eq: eqRole }))
    const select = vi.fn(() => ({ eq: eqId }))
    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn((table) => table === 'user_accounts' ? { select } : { upsert: metadataUpsert }),
      auth: { admin: { inviteUserByEmail } },
    } as never)
    const form = new FormData()
    form.set('client_id', 'client-1')

    await resendClientInvite(form)

    expect(metadataUpsert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'client-1', invite_sent_at: expect.any(String) }), { onConflict: 'owner_id' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('records an onboarding timestamp and selected segment in client metadata', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ upsert })) } as never)
    vi.mocked(ensureClientProvisioned).mockResolvedValue({ ok: true, userId: 'client-1', identity: 'invited', profile: 'created' })
    const form = new FormData()
    form.set('email', 'client@example.com')
    form.set('full_name', 'Client')
    form.set('segment', '  Enterprise  ')

    await onboardClient(form)

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: 'client-1', segment: 'Enterprise', invite_sent_at: expect.any(String) }), { onConflict: 'owner_id' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin')
  })

  it('looks up a client profile before using the atomic publication RPC', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'profile-1' }, error: null })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    const rpc = vi.fn().mockResolvedValue({ data: 'client-slug', error: null })
    vi.mocked(createAdminClient).mockReturnValue({ from: vi.fn(() => ({ select })), rpc } as never)
    const form = new FormData()
    form.set('client_id', 'client-1')
    form.set('status', 'published')

    await setClientPublicationForClient(form)

    expect(eq).toHaveBeenCalledWith('owner_id', 'client-1')
    expect(rpc).toHaveBeenCalledWith('admin_set_profile_publication', { p_profile_id: 'profile-1', p_publish: true })
  })
})
