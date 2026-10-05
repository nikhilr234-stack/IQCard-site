export const CLIENT_STATUSES = ['Live', 'Review', 'Draft', 'Invited', 'No profile'] as const

export type ClientStatus = (typeof CLIENT_STATUSES)[number]

export type Client = {
  id: string
  name: string
  email: string
  status: ClientStatus
  profileUrl: string | null
  joinedAt: string
  completion: number
  lastActiveAt: string | null
  segment: string
  inviteOpened: boolean
  startedProfile: boolean
  completedProfile: boolean
}

export type ClientFilters = {
  search?: string
  status?: ClientStatus | 'All'
  segment?: string | 'All'
}

export type ClientSort = {
  key: keyof Pick<Client, 'name' | 'email' | 'status' | 'joinedAt' | 'completion' | 'lastActiveAt' | 'segment'>
  direction: 'asc' | 'desc'
}

export type DashboardDateRange = 7 | 14 | 30 | 90

export type DashboardView =
  | { kind: 'status'; label: string; status: ClientStatus }
  | { kind: 'inviteOpened'; label: string }
  | { kind: 'weeklyActive'; label: string }
  | { kind: 'completionRange'; label: string; min: number; max: number }
  | { kind: 'joinedDate'; label: string; date: string }
  | { kind: 'joinedRecent'; label: string; days: DashboardDateRange }
  | { kind: 'funnel'; label: string; stage: 'invited' | 'opened' | 'started' | 'completed' | 'live' }
  | { kind: 'client'; label: string; id: string }
  | { kind: 'segment'; label: string; segment: string }
  | { kind: 'followUp'; label: string }
