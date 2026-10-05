'use client'

import { useMemo, useRef, useState } from 'react'

import { applyDashboardView, filterClientsByDateRange, getCompletionDistribution, getDashboardKpis, getOnboardingChart, getOnboardingFunnel, getQuickInsights, getStatusBreakdown } from './selectors'
import type { Client, ClientStatus, DashboardDateRange, DashboardView } from './types'
import { AddClientPanel, type OnboardInput } from './components/AddClientPanel'
import { AdminShell } from './components/AdminShell'
import { AdminSidebar } from './components/AdminSidebar'
import { AdminTopbar } from './components/AdminTopbar'
import { ClientTable } from './components/ClientTable'
import { ClientsHeader } from './components/ClientsHeader'
import { CompletionDistribution } from './components/CompletionDistribution'
import { InsightRail } from './components/InsightRail'
import { KpiStrip } from './components/KpiStrip'
import { OnboardingChart } from './components/OnboardingChart'
import { OnboardingFunnel } from './components/OnboardingFunnel'
import { StatusDonut } from './components/StatusDonut'
import './admin.css'

export type AdminDashboardActions = { onOnboard: (input: OnboardInput) => Promise<void>; onPublish: (clientId: string) => Promise<void>; onUnpublish: (clientId: string) => Promise<void>; onResend: (clientId: string) => Promise<void>; onSegmentChange: (clientId: string, segment: string) => Promise<void> }

export function AdminDashboard({ clients, actions, initialNotice = '' }: { clients: readonly Client[]; actions: AdminDashboardActions; initialNotice?: string }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ClientStatus | 'All'>('All')
  const [dateRange, setDateRange] = useState<DashboardDateRange>(30)
  const [activeView, setActiveView] = useState<DashboardView | null>(null)
  const [notice, setNotice] = useState(initialNotice)
  const emailInputRef = useRef<HTMLInputElement>(null)
  const kpis = useMemo(() => getDashboardKpis(clients), [clients])
  const statusBreakdown = useMemo(() => getStatusBreakdown(clients), [clients])
  const funnel = useMemo(() => getOnboardingFunnel(clients), [clients])
  const completion = useMemo(() => getCompletionDistribution(clients), [clients])
  const chart = useMemo(() => getOnboardingChart(clients), [clients])
  const insights = useMemo(() => getQuickInsights(clients), [clients])
  const directoryClients = useMemo(() => applyDashboardView(filterClientsByDateRange(clients, dateRange), activeView), [activeView, clients, dateRange])
  async function invoke(label: string, callback: () => Promise<void>) {
    setNotice('')
    try {
      await callback()
      setNotice(`${label} updated.`)
    } catch {
      setNotice(`${label} could not be completed. Please try again.`)
    }
  }

  async function onboard(input: OnboardInput) {
    setNotice('')
    await actions.onOnboard(input)
    setNotice('Client invitation updated.')
  }

  function focusOnboarding() {
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    emailInputRef.current?.focus()
    emailInputRef.current?.scrollIntoView({ behavior, block: 'center' })
  }

  function selectView(view: DashboardView) {
    setActiveView(view)
    setQuery('')
    setStatus('All')
  }

  return <div className="iq-admin-dashboard"><AdminShell sidebar={<AdminSidebar />} topbar={<AdminTopbar query={query} status={status} dateRange={dateRange} onQueryChange={setQuery} onStatusChange={setStatus} onDateRangeChange={setDateRange} />} insightRail={<InsightRail clients={clients} insights={insights} />}><ClientsHeader /><AddClientPanel onOnboard={onboard} emailInputRef={emailInputRef} /><KpiStrip onSelect={selectView} items={[{ icon: '◎', value: kpis.total, label: 'Total clients', view: { kind: 'funnel', label: 'Total clients', stage: 'invited' } }, { icon: '●', value: kpis.live, label: 'Live profiles', view: { kind: 'status', label: 'Live profiles', status: 'Live' } }, { icon: '◷', value: statusBreakdown.Review, label: 'Awaiting review', view: { kind: 'status', label: 'Awaiting review', status: 'Review' } }, { icon: '▤', value: kpis.draft, label: 'Draft profiles', view: { kind: 'status', label: 'Draft profiles', status: 'Draft' } }, { icon: '↗', value: kpis.published, label: 'Published profiles', view: { kind: 'funnel', label: 'Published profiles', stage: 'completed' } }, { icon: '◷', value: kpis.pendingInvites, label: 'Pending invites', view: { kind: 'status', label: 'Pending invites', status: 'Invited' } }, { icon: '◎', value: `${Math.round(kpis.activationRate)}%`, label: 'Activation rate', view: { kind: 'inviteOpened', label: 'Opened invites' } }, { icon: '◒', value: `${Math.round(kpis.completionRate)}%`, label: 'Avg. completion', view: { kind: 'completionRange', label: 'In-progress completion', min: 1, max: 99 } }, { icon: '▥', value: kpis.weeklyActive, label: 'Weekly active', view: { kind: 'weeklyActive', label: 'Weekly active' } }]} /><section className="analytics-grid" aria-label="Client analytics"><OnboardingChart points={chart} onSelect={(point) => selectView({ kind: 'joinedDate', label: point.date, date: point.date })} /><StatusDonut items={statusBreakdown} onSelect={(selected) => selectView({ kind: 'status', label: `${selected} clients`, status: selected })} /><OnboardingFunnel stages={[{ label: 'Invited', count: funnel.invited }, { label: 'Opened', count: funnel.openedInvite }, { label: 'Started', count: funnel.startedProfile }, { label: 'Completed', count: funnel.completedProfile }, { label: 'Live', count: funnel.live }]} onSelect={(stage) => selectView({ kind: 'funnel', label: `${stage.label} clients`, stage: stage.label.toLowerCase() as 'invited' | 'opened' | 'started' | 'completed' | 'live' })} /><CompletionDistribution buckets={completion} /></section>{activeView ? <div className="active-view" role="status">Active view: {activeView.label}<button type="button" onClick={() => setActiveView(null)}>Clear</button></div> : null}<ClientTable clients={directoryClients} query={query} status={status} onQueryChange={setQuery} onAddClientFocus={focusOnboarding} onPublish={(id) => invoke('Publication', () => actions.onPublish(id))} onUnpublish={(id) => invoke('Publication', () => actions.onUnpublish(id))} onResend={(id) => invoke('Invitation', () => actions.onResend(id))} onSegmentChange={(id, segment) => invoke('Segment', () => actions.onSegmentChange(id, segment))} /><p className="action-toast" role="status" aria-live="polite">{notice}</p></AdminShell></div>
}
