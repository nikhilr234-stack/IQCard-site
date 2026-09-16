/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminDashboard, type AdminDashboardActions } from './AdminDashboard'
import type { Client } from './types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const clients: Client[] = [
  { id: 'draft-1', name: 'Ada Lovelace', email: 'ada@example.com', status: 'Draft', profileUrl: '/ada', joinedAt: '2026-09-01T00:00:00Z', completion: 70, lastActiveAt: '2026-09-08T00:00:00Z', segment: 'Technology', inviteOpened: true, startedProfile: true, completedProfile: false },
]

const actions: AdminDashboardActions = {
  onOnboard: vi.fn(async () => undefined),
  onPublish: vi.fn(async () => undefined),
  onUnpublish: vi.fn(async () => undefined),
  onResend: vi.fn(async () => undefined),
  onSegmentChange: vi.fn(async () => undefined),
}

function button(host: HTMLElement, name: RegExp) {
  const match = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => name.test(candidate.getAttribute('aria-label') ?? candidate.textContent ?? ''))
  if (!match) throw new Error(`Missing button: ${name}`)
  return match
}

describe('AdminDashboard', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root.render(<AdminDashboard clients={clients} actions={actions} />))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.clearAllMocks()
  })

  it('renders the clients heading, accessible search, and quick insights from clients', () => {
    expect(host.querySelector('h1')?.textContent).toBe('Clients')
    expect(host.querySelector<HTMLInputElement>('[aria-label="Search clients"]')).not.toBeNull()
    expect(host.textContent).toContain('Quick insights')
  })

  it('delegates publishing to the injected action without mutating the client list', async () => {
    await act(async () => button(host, /publish ada lovelace/i).click())

    expect(actions.onPublish).toHaveBeenCalledWith('draft-1')
    expect(clients[0].status).toBe('Draft')
  })
})
