import { describe, expect, it } from 'vitest'
import type { Client } from './types'
import { filterClients, getCompletionDistribution, getDashboardKpis, getOnboardingChart, getOnboardingFunnel, getQuickInsights, getStatusBreakdown, paginateClients, sortClients, toClientCsvRows } from './selectors'

const clients: Client[] = [
  { id: 'live', name: 'Ada Lovelace', email: 'ada@example.com', status: 'Live', profileUrl: '/ada', joinedAt: '2026-09-01T00:00:00Z', completion: 100, lastActiveAt: '2026-09-08T00:00:00Z', segment: 'Enterprise', inviteOpened: true, startedProfile: true, completedProfile: true },
  { id: 'draft', name: 'Grace Hopper', email: 'grace@example.com', status: 'Draft', profileUrl: '/grace', joinedAt: '2026-09-02T00:00:00Z', completion: 50, lastActiveAt: null, segment: 'Startup', inviteOpened: true, startedProfile: true, completedProfile: false },
  { id: 'invited', name: 'Linus Torvalds', email: 'linus@example.com', status: 'Invited', profileUrl: null, joinedAt: '2026-09-03T00:00:00Z', completion: 0, lastActiveAt: null, segment: 'Startup', inviteOpened: false, startedProfile: false, completedProfile: false },
  { id: 'none', name: 'Radia Perlman', email: 'radia@example.com', status: 'No profile', profileUrl: null, joinedAt: '2026-09-04T00:00:00Z', completion: 0, lastActiveAt: null, segment: 'Unassigned', inviteOpened: false, startedProfile: false, completedProfile: false },
]

describe('admin dashboard selectors', () => {
  it('filters and sorts the canonical client list without mutating it', () => {
    expect(filterClients(clients, { search: 'grace', status: 'Draft', segment: 'Startup' }).map(({ id }) => id)).toEqual(['draft'])
    expect(sortClients(clients, { key: 'joinedAt', direction: 'desc' }).map(({ id }) => id)).toEqual(['none', 'invited', 'draft', 'live'])
    expect(clients.map(({ id }) => id)).toEqual(['live', 'draft', 'invited', 'none'])
  })

  it('derives KPIs, status breakdown, and funnel from the supplied clients', () => {
    expect(getDashboardKpis(clients, new Date('2026-09-16T00:00:00Z'))).toEqual({ total: 4, live: 1, draft: 1, published: 1, pendingInvites: 1, activationRate: 50, completionRate: 37.5, inviteOpenRate: .5, weeklyActive: 0 })
    expect(getStatusBreakdown(clients)).toEqual({ Live: 1, Draft: 1, Invited: 1, 'No profile': 1 })
    expect(getOnboardingFunnel(clients)).toEqual({ invited: 4, openedInvite: 2, startedProfile: 2, completedProfile: 1, live: 1 })
  })

  it('builds chart inputs from client join dates and completion values', () => {
    expect(getOnboardingChart(clients)).toEqual([
      { date: '2026-09-01', joined: 1, live: 1 },
      { date: '2026-09-02', joined: 1, live: 0 },
      { date: '2026-09-03', joined: 1, live: 0 },
      { date: '2026-09-04', joined: 1, live: 0 },
    ])
    expect(getCompletionDistribution(clients)).toEqual({ notStarted: 2, inProgress: 1, completed: 1 })
  })

  it('creates quick insights, pagination, and CSV rows from the same clients', () => {
    expect(getQuickInsights(clients)).toEqual([
      { id: 'invited-without-open', count: 2, label: '2 clients have not opened their invite' },
      { id: 'started-not-complete', count: 1, label: '1 client started a profile but has not completed it' },
    ])
    expect(paginateClients(clients, 2, 2).map(({ id }) => id)).toEqual(['invited', 'none'])
    expect(toClientCsvRows(clients)[0]).toEqual({ Name: 'Ada Lovelace', Email: 'ada@example.com', Status: 'Live', 'Profile URL': '/ada', Joined: '2026-09-01T00:00:00Z', Completion: '100%', Segment: 'Enterprise', 'Last active': '2026-09-08T00:00:00Z' })
  })
})
