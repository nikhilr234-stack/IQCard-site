import { describe, expect, it, vi } from 'vitest'

import type { Client } from '@/features/admin/types'
import { requireAdminAccount } from '@/lib/auth/account'
import { listAdminClients } from '@/lib/admin/repository'
import { AdminDashboard } from '@/features/admin/AdminDashboard'
import AdminPage from './page'

vi.mock('@/lib/auth/account', () => ({ requireAdminAccount: vi.fn() }))
vi.mock('@/lib/admin/repository', () => ({ listAdminClients: vi.fn() }))
vi.mock('@/features/admin/AdminDashboard', () => ({ AdminDashboard: vi.fn(() => null) }))
vi.mock('@/app/actions/admin', () => ({
  onboardClient: vi.fn(),
  resendClientInvite: vi.fn(),
  setClientPublication: vi.fn(),
  setClientPublicationForClient: vi.fn(),
  updateClientSegment: vi.fn(),
}))

const clients: Client[] = [{
  id: 'client-1', name: 'Ada Lovelace', email: 'ada@example.com', status: 'Draft', profileUrl: '/ada', joinedAt: '2026-09-01T00:00:00Z', completion: 50, lastActiveAt: null, segment: 'Technology', inviteOpened: true, startedProfile: true, completedProfile: false,
}]

function findDashboard(node: unknown): { props: { clients: Client[]; actions: Record<string, unknown> } } | null {
  if (!node || typeof node !== 'object') return null
  const element = node as { type?: unknown; props?: { children?: unknown } }
  if (element.type === AdminDashboard) return element as { props: { clients: Client[]; actions: Record<string, unknown> } }
  const children = element.props?.children
  for (const child of Array.isArray(children) ? children : [children]) {
    const found = findDashboard(child)
    if (found) return found
  }
  return null
}

describe('/admin page', () => {
  it('requires an administrator, loads canonical clients, and mounts the dashboard with action adapters', async () => {
    vi.mocked(requireAdminAccount).mockResolvedValue({ id: 'admin-1', email: 'admin@example.com', role: 'admin' })
    vi.mocked(listAdminClients).mockResolvedValue(clients)

    const page = await AdminPage({ searchParams: Promise.resolve({}) })
    const dashboard = findDashboard(page)

    expect(requireAdminAccount).toHaveBeenCalledOnce()
    expect(listAdminClients).toHaveBeenCalledOnce()
    expect(dashboard?.props.clients).toBe(clients)
    expect(Object.keys(dashboard?.props.actions ?? {})).toEqual(['onOnboard', 'onPublish', 'onUnpublish', 'onResend', 'onSegmentChange'])
  })
})
