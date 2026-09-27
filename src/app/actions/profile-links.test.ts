import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { createServerClient } from '@/lib/supabase/server'
import { saveProfileLinks } from './profile-links'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

describe('profile link actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuthenticatedAccount).mockResolvedValue({
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'client',
    })
  })

  it('replaces normalized links through the authenticated atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { id: 'profile-1', slug: 'owner' },
                error: null,
              }),
            })),
          })),
        }
      }
      return {
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)
    const form = new FormData()
    form.set('links', JSON.stringify([
      { label: ' Website ', url: ' https://example.com ' },
      { label: ' ', url: ' ' },
    ]))

    await saveProfileLinks(form)

    expect(rpc).toHaveBeenCalledWith('replace_own_profile_links', {
      p_links: [{ label: 'Website', url: 'https://example.com' }],
    })
    expect(from).not.toHaveBeenCalledWith('profile_links')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/owner')
  })

  it('keeps link edits behind the authenticated profile-link RPC and rejects invalid URLs before saving', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const single = vi.fn().mockResolvedValue({ data: { id: 'profile-1', slug: 'owner' }, error: null })
    const from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single })) })) }))
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)
    const form = new FormData()
    form.set('links', JSON.stringify([{ label: 'Portfolio', url: 'javascript:alert(1)' }]))

    await expect(saveProfileLinks(form)).rejects.toThrow('Use an HTTP(S) link or a contact link.')
    expect(requireAuthenticatedAccount).toHaveBeenCalledOnce()
    expect(createServerClient).not.toHaveBeenCalled()
    expect(rpc).not.toHaveBeenCalled()
  })
})
