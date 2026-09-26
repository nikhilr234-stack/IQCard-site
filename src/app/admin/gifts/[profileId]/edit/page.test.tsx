import { beforeEach, describe, expect, it, vi } from 'vitest'
import { requireAdminAccount } from '@/lib/auth/account'
import { createAdminClient } from '@/lib/supabase/admin'
import EditGiftPage from './page'

const { notFound } = vi.hoisted(() => ({ notFound: vi.fn(() => { throw new Error('NOT_FOUND') }) }))
vi.mock('next/navigation', () => ({ notFound }))
vi.mock('@/lib/auth/account', () => ({ requireAdminAccount: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

function client(ownerId: string | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: { id: 'gift-1', owner_id: ownerId, full_name: 'Yatish P', headline: 'Driver', tagline: '', phone: '', whatsapp: '', location: '', profile_links: [] },
    error: null,
  })
  return { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) })) })) }
}

describe('admin gift details route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAdminAccount).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
  })

  it('keeps claimed gifts read-only by refusing to render the admin editor', async () => {
    vi.mocked(createAdminClient).mockReturnValue(client('recipient-1') as never)

    await expect(EditGiftPage({ params: Promise.resolve({ profileId: 'gift-1' }) })).rejects.toThrow('NOT_FOUND')

    expect(notFound).toHaveBeenCalledOnce()
  })

  it('renders details editing only while the gift remains unclaimed', async () => {
    vi.mocked(createAdminClient).mockReturnValue(client(null) as never)

    const page = await EditGiftPage({ params: Promise.resolve({ profileId: 'gift-1' }) })

    expect(page.type).toBe('main')
    expect(notFound).not.toHaveBeenCalled()
  })
})
