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

import { getVerifiedCurrentAccount, requireAdminAccount, requireVerifiedAdminAccount } from './account'

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

describe('getVerifiedCurrentAccount', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset()
    mockGetUser.mockReset()
  })

  it('returns null when the signed-in address is not verified', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'client@example.com', email_confirmed_at: null } } })

    await expect(getVerifiedCurrentAccount()).resolves.toBeNull()
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('returns the account only after email verification', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123', email: 'client@example.com', email_confirmed_at: '2026-10-03T00:00:00.000Z' } } })
    mockMaybeSingle.mockResolvedValue({ data: { role: 'client' }, error: null })

    await expect(getVerifiedCurrentAccount()).resolves.toEqual({ id: 'user-123', email: 'client@example.com', role: 'client' })
  })
})

describe('requireVerifiedAdminAccount', () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset()
    mockGetUser.mockReset()
  })

  it('redirects an unverified admin before loading the account role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@example.com', email_confirmed_at: null } } })

    await expect(requireVerifiedAdminAccount()).rejects.toThrow('redirect:/login?next=%2Fadmin')
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('returns a verified administrator', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1', email: 'admin@example.com', email_confirmed_at: '2026-10-03T00:00:00.000Z' } } })
    mockMaybeSingle.mockResolvedValue({ data: { role: 'admin' }, error: null })

    await expect(requireVerifiedAdminAccount()).resolves.toEqual({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
  })
})
