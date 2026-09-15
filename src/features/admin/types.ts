export const CLIENT_STATUSES = ['Live', 'Draft', 'Invited', 'No profile'] as const

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
