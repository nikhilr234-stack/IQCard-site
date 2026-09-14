import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.hoisted(() => vi.fn())
const mockMaybeSingle = vi.hoisted(() => vi.fn())

vi.mock('@/lib/env', () => ({
  getAdminEmails: vi.fn(() => new Set<string>()),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
    }),
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: (destination: string) => {
    throw new Error(`redirect:${destination}`)
  },
}))

import { requireAdminAccount } from './account'

describe('requireAdminAccount', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'client@example.com',
        },
      },
    })
  })

  it('redirects a client account to the dashboard with an admin-only error', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'client' }, error: null })

    await expect(requireAdminAccount()).rejects.toThrow('redirect:/dashboard?error=admin-only')
  })

  it('returns a verified administrator account', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null })

    await expect(requireAdminAccount()).resolves.toEqual({
      id: 'user-123',
      email: 'client@example.com',
      role: 'admin',
    })
  })
})
