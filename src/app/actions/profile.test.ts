import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { createServerClient } from '@/lib/supabase/server'
import { publishProfile, saveProfileDraft, unpublishProfile } from './profile'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

describe('profile actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuthenticatedAccount).mockResolvedValue({
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'client',
    })
  })

  it('replaces editor links through the authenticated atomic RPC without direct link-table writes', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const profileTable = {
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'profile-1' }, error: null }),
        })),
      })),
    }
    const profileLinksTable = {
      delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      insert: vi.fn().mockResolvedValue({ error: null }),
    }
    const from = vi.fn((table: string) => (
      table === 'profiles' ? profileTable : profileLinksTable
    ))
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)
    const form = new FormData()
    form.set('slug', 'owner')
    form.set('full_name', 'Owner Name')
    form.set('links', JSON.stringify([
      { label: ' Website ', url: ' https://example.com ' },
      { label: ' ', url: ' ' },
    ]))

    await saveProfileDraft(form)

    expect(rpc).toHaveBeenCalledWith('replace_own_profile_links', {
      p_links: [{ label: 'Website', url: 'https://example.com' }],
    })
    expect(from).not.toHaveBeenCalledWith('profile_links')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('persists normalized profile fields and explicit visibility choices', async () => {
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const from = vi.fn(() => ({ update }))
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc: vi.fn() } as never)
    const form = new FormData()
    form.set('slug', 'ada-lovelace')
    form.set('full_name', '  Ada Lovelace  ')
    form.set('headline', '  Mathematician  ')
    form.set('bio', '  Writes analytical engines.  ')
    form.set('email', '  ADA@EXAMPLE.COM  ')
    form.set('phone', '  +44 20 1234 5678  ')
    form.set('whatsapp', '  +44 7700 900123  ')
    form.set('location', '  London  ')
    form.set('public_email_visible', 'on')
    form.set('phone_visible', 'false')
    form.set('location_visible', 'on')

    await saveProfileDraft(form)

    expect(update).toHaveBeenCalledWith({
      slug: 'ada-lovelace',
      full_name: 'Ada Lovelace',
      headline: 'Mathematician',
      bio: 'Writes analytical engines.',
      email: 'ada@example.com',
      phone: '+44 20 1234 5678',
      whatsapp: '+44 7700 900123',
      location: 'London',
      public_email_visible: true,
      phone_visible: false,
      whatsapp_visible: false,
      location_visible: true,
    })
  })

  it('publishes only through the atomic onboarding publication boundary', async () => {
    const directUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { slug: 'owner' }, error: null }) })),
      })),
      update: directUpdate,
    }))
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)

    await publishProfile()

    expect(rpc).toHaveBeenCalledWith('complete_own_onboarding_publish', { p_publish: true })
    expect(directUpdate).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/owner')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })

  it('does not publish when the transactional prerequisite check rejects the request', async () => {
    const directUpdate = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))
    const rpc = vi.fn().mockResolvedValue({ error: new Error('Complete the earlier onboarding steps first') })
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { slug: 'owner' }, error: null }) })),
      })),
      update: directUpdate,
    }))
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)

    await expect(publishProfile()).rejects.toThrow('Unable to publish profile')

    expect(directUpdate).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('unpublishes through a narrow revocation RPC without a raw status update', async () => {
    const directUpdate = vi.fn()
    const rpc = vi.fn().mockResolvedValue({ data: 'owner', error: null })
    vi.mocked(createServerClient).mockResolvedValue({
      rpc,
      from: vi.fn(() => ({ update: directUpdate })),
    } as never)

    await unpublishProfile()

    expect(rpc).toHaveBeenCalledWith('unpublish_own_profile')
    expect(directUpdate).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/owner')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
  })
})
