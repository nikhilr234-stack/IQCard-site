import type { Client, ClientFilters, ClientSort, ClientStatus } from './types'

export function filterClients(clients: readonly Client[], filters: ClientFilters): Client[] {
  const search = filters.search?.trim().toLocaleLowerCase() ?? ''
  return clients.filter((client) => {
    const matchesSearch = !search || [client.name, client.email, client.segment].some((value) => value.toLocaleLowerCase().includes(search))
    const matchesStatus = !filters.status || filters.status === 'All' || client.status === filters.status
    const matchesSegment = !filters.segment || filters.segment === 'All' || client.segment === filters.segment
    return matchesSearch && matchesStatus && matchesSegment
  })
}

export function sortClients(clients: readonly Client[], sort: ClientSort): Client[] {
  const direction = sort.direction === 'asc' ? 1 : -1
  return [...clients].sort((left, right) => {
    const leftValue = left[sort.key] ?? ''
    const rightValue = right[sort.key] ?? ''
    if (typeof leftValue === 'number' && typeof rightValue === 'number') return (leftValue - rightValue) * direction
    return String(leftValue).localeCompare(String(rightValue)) * direction
  })
}

export function paginateClients(clients: readonly Client[], page: number, pageSize: number): Client[] {
  const validPage = Math.max(page, 1)
  const validPageSize = Math.max(pageSize, 1)
  const start = (validPage - 1) * validPageSize
  return clients.slice(start, start + validPageSize)
}

export function getDashboardKpis(clients: readonly Client[]) {
  const total = clients.length
  const completion = clients.reduce((sum, client) => sum + client.completion, 0)
  const opened = clients.filter((client) => client.inviteOpened).length
  return {
    total,
    live: clients.filter((client) => client.status === 'Live').length,
    completionRate: total ? completion / total : 0,
    inviteOpenRate: total ? opened / total : 0,
  }
}

export function getStatusBreakdown(clients: readonly Client[]): Record<ClientStatus, number> {
  return clients.reduce<Record<ClientStatus, number>>((breakdown, client) => {
    breakdown[client.status] += 1
    return breakdown
  }, { Live: 0, Draft: 0, Invited: 0, 'No profile': 0 })
}

export function getOnboardingFunnel(clients: readonly Client[]) {
  return {
    invited: clients.length,
    openedInvite: clients.filter((client) => client.inviteOpened).length,
    startedProfile: clients.filter((client) => client.startedProfile).length,
    completedProfile: clients.filter((client) => client.completedProfile).length,
    live: clients.filter((client) => client.status === 'Live').length,
  }
}

export function getOnboardingChart(clients: readonly Client[]) {
  const buckets = new Map<string, { date: string; joined: number; live: number }>()
  for (const client of clients) {
    const date = client.joinedAt.slice(0, 10)
    const bucket = buckets.get(date) ?? { date, joined: 0, live: 0 }
    bucket.joined += 1
    if (client.status === 'Live') bucket.live += 1
    buckets.set(date, bucket)
  }
  return [...buckets.values()].sort((left, right) => left.date.localeCompare(right.date))
}

export function getCompletionDistribution(clients: readonly Client[]) {
  return clients.reduce((distribution, client) => {
    if (client.completion === 0) distribution.notStarted += 1
    else if (client.completion >= 1) distribution.completed += 1
    else distribution.inProgress += 1
    return distribution
  }, { notStarted: 0, inProgress: 0, completed: 0 })
}

export function getQuickInsights(clients: readonly Client[]) {
  const unopened = clients.filter((client) => !client.inviteOpened).length
  const startedNotComplete = clients.filter((client) => client.startedProfile && !client.completedProfile).length
  return [
    ...(unopened ? [{ id: 'invited-without-open', count: unopened, label: `${unopened} client${unopened === 1 ? '' : 's'} have not opened their invite` }] : []),
    ...(startedNotComplete ? [{ id: 'started-not-complete', count: startedNotComplete, label: `${startedNotComplete} client${startedNotComplete === 1 ? '' : 's'} started a profile but ${startedNotComplete === 1 ? 'has' : 'have'} not completed it` }] : []),
  ]
}

export function toClientCsvRows(clients: readonly Client[]) {
  return clients.map((client) => ({
    Name: client.name,
    Email: client.email,
    Status: client.status,
    'Profile URL': client.profileUrl ?? '',
    Joined: client.joinedAt,
    Completion: `${Math.round(client.completion * 100)}%`,
    Segment: client.segment,
    'Last active': client.lastActiveAt ?? '',
  }))
}
