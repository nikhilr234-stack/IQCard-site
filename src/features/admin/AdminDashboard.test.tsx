/** @vitest-environment jsdom */

import { act } from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AdminDashboard, type AdminDashboardActions } from './AdminDashboard'
import type { Client } from './types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

const clients: Client[] = [
  { id: 'draft-1', name: 'Ada Lovelace', email: 'ada@example.com', status: 'Draft', profileUrl: '/ada', joinedAt: daysAgo(10), completion: 70, lastActiveAt: daysAgo(2), segment: 'Technology', inviteOpened: true, startedProfile: true, completedProfile: false },
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

function setValue(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLSelectElement.prototype, 'value')
  descriptor?.set?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('AdminDashboard', () => {
  let host: HTMLDivElement
  let root: Root
  let stylesheet: HTMLStyleElement

  beforeEach(async () => {
    stylesheet = document.createElement('style')
    stylesheet.textContent = readFileSync(resolve(process.cwd(), 'src/features/admin/admin.css'), 'utf8')
    document.head.append(stylesheet)
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root.render(<AdminDashboard clients={clients} actions={actions} />))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    stylesheet.remove()
    vi.clearAllMocks()
  })

  it('renders the clients heading, accessible search, and quick insights from clients', () => {
    expect(host.querySelector('h1')?.textContent).toBe('Clients')
    expect(host.querySelector<HTMLInputElement>('[aria-label="Search clients"]')).not.toBeNull()
    expect(host.textContent).toContain('Quick insights')
  })

  it('gives an administrator a direct link to their personal dashboard', () => {
    const personalDashboard = [...host.querySelectorAll<HTMLAnchorElement>('a')].find((link) => link.textContent?.trim() === 'Your dashboard')

    expect(personalDashboard?.getAttribute('href')).toBe('/dashboard')
  })

  it('delegates publishing to the injected action without mutating the client list', async () => {
    await act(async () => button(host, /publish ada lovelace/i).click())

    expect(actions.onPublish).toHaveBeenCalledWith('draft-1')
    expect(clients[0].status).toBe('Draft')
  })

  it('keeps onboarding values and reports an accessible error when an invitation fails', async () => {
    const onOnboard = vi.fn(async () => { throw new Error('Invitation service unavailable') })
    await act(async () => root.render(<AdminDashboard clients={clients} actions={{ ...actions, onOnboard }} />))

    await act(async () => {
      setValue(host.querySelector<HTMLInputElement>('[aria-label="Client email"]')!, 'ada@example.com')
      setValue(host.querySelector<HTMLInputElement>('[aria-label="Client name"]')!, 'Ada Lovelace')
      setValue(host.querySelector<HTMLSelectElement>('[aria-label="Client segment"]')!, 'Technology')
    })
    await act(async () => host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))

    expect(host.querySelector<HTMLInputElement>('[aria-label="Client email"]')!.value).toBe('ada@example.com')
    expect(host.querySelector<HTMLInputElement>('[aria-label="Client name"]')!.value).toBe('Ada Lovelace')
    expect(host.querySelector<HTMLSelectElement>('[aria-label="Client segment"]')!.value).toBe('Technology')
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('could not be completed')
  })

  it('keeps the onboarding email and send action on dedicated rows', () => {
    const email = host.querySelector<HTMLInputElement>('[aria-label="Client email"]')!
    const submit = button(host, /send access link/i)

    expect(getComputedStyle(email.closest('label')!).gridColumn).toBe('1 / -1')
    expect(getComputedStyle(submit).gridColumn).toBe('1 / -1')
  })

  it('renders eight data-derived overview cards and lets admins choose rows per page', async () => {
    const tableClients = Array.from({ length: 6 }, (_, index): Client => ({
      ...clients[0],
      id: `client-${index}`,
      name: `Client ${index + 1}`,
      email: `client-${index + 1}@example.com`,
      joinedAt: daysAgo(index + 1),
    }))
    await act(async () => root.render(<AdminDashboard clients={tableClients} actions={actions} />))

    expect(host.querySelectorAll('.kpi-card')).toHaveLength(8)
    const rowsPerPage = host.querySelector<HTMLSelectElement>('[aria-label="Rows per page"]')
    expect(rowsPerPage).not.toBeNull()
    await act(async () => setValue(rowsPerPage!, '10'))
    expect(host.textContent).toContain('Showing 1–6 of 6 clients')
  })

  it('filters the directory from an analytical selection and clears the active view', async () => {
    await act(async () => button(host, /draft profiles/i).click())

    expect(host.textContent).toContain('Active view: Draft profiles')
    await act(async () => button(host, /^clear$/i).click())
    expect(host.textContent).not.toContain('Active view: Draft profiles')
  })

  it('overrides the app-wide narrow main rule so the desktop dashboard can use its grid width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/features/admin/admin.css'), 'utf8')

    expect(css).toContain('.iq-admin-dashboard .admin-shell__main { width: 100%; max-width: none; margin: 0;')
  })
})
