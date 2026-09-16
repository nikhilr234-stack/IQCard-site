'use client'

import { useMemo, useRef, useState } from 'react'

import { getCompletionDistribution, getDashboardKpis, getOnboardingChart, getOnboardingFunnel, getQuickInsights, getStatusBreakdown } from './selectors'
import type { Client, ClientStatus } from './types'
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

export function AdminDashboard({ clients, actions }: { clients: readonly Client[]; actions: AdminDashboardActions }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ClientStatus | 'All'>('All')
  const [dateRange, setDateRange] = useState('Last 30 days')
  const [notice, setNotice] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)
  const kpis = useMemo(() => getDashboardKpis(clients), [clients])
  const statusBreakdown = useMemo(() => getStatusBreakdown(clients), [clients])
  const funnel = useMemo(() => getOnboardingFunnel(clients), [clients])
  const completion = useMemo(() => getCompletionDistribution(clients), [clients])
  const chart = useMemo(() => getOnboardingChart(clients), [clients])
  const insights = useMemo(() => getQuickInsights(clients), [clients])
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

  return <div className="iq-admin-dashboard"><AdminShell sidebar={<AdminSidebar />} topbar={<AdminTopbar query={query} status={status} dateRange={dateRange} onQueryChange={setQuery} onStatusChange={setStatus} onDateRangeChange={setDateRange} />} insightRail={<InsightRail clients={clients} insights={insights} />}><ClientsHeader /><AddClientPanel onOnboard={onboard} emailInputRef={emailInputRef} /><KpiStrip items={[{ icon: '◎', value: kpis.total, label: 'Total clients' }, { icon: '●', value: kpis.live, label: 'Live profiles' }, { icon: '▤', value: kpis.draft, label: 'Draft profiles' }, { icon: '↗', value: kpis.published, label: 'Published profiles' }, { icon: '◷', value: kpis.pendingInvites, label: 'Pending invites' }, { icon: '◎', value: `${Math.round(kpis.activationRate)}%`, label: 'Activation rate' }, { icon: '◒', value: `${Math.round(kpis.completionRate)}%`, label: 'Avg. completion' }, { icon: '▥', value: kpis.weeklyActive, label: 'Weekly active' }]} /><section className="analytics-grid" aria-label="Client analytics"><OnboardingChart points={chart} /><StatusDonut items={statusBreakdown} /><OnboardingFunnel stages={[{ label: 'Invited', count: funnel.invited }, { label: 'Opened', count: funnel.openedInvite }, { label: 'Started', count: funnel.startedProfile }, { label: 'Completed', count: funnel.completedProfile }, { label: 'Live', count: funnel.live }]} /><CompletionDistribution buckets={completion} /></section><ClientTable clients={clients} query={query} status={status} onQueryChange={setQuery} onAddClientFocus={focusOnboarding} onPublish={(id) => invoke('Publication', () => actions.onPublish(id))} onUnpublish={(id) => invoke('Publication', () => actions.onUnpublish(id))} onResend={(id) => invoke('Invitation', () => actions.onResend(id))} onSegmentChange={(id, segment) => invoke('Segment', () => actions.onSegmentChange(id, segment))} /><p className="action-toast" role="status" aria-live="polite">{notice}</p></AdminShell></div>
}
