import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAdminAccount } from '@/lib/auth/account'
import { createAdminClient } from '@/lib/supabase/admin'
import { setClientPublication } from './admin'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAdminAccount: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

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
