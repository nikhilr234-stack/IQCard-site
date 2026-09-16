import type { Client } from '../types'
import { StatusBadge } from './StatusBadge'

export function InsightRail({ clients, insights }: { clients: readonly Client[]; insights: readonly { id: string; count: number; label: string }[] }) {
  const recent = [...clients].sort((left, right) => right.joinedAt.localeCompare(left.joinedAt)).slice(0, 4)
  return <div className="insight-stack"><section className="insight-card panel"><h2>Quick insights</h2>{insights.length ? <ul>{insights.map((insight) => <li key={insight.id}><strong>{insight.count}</strong><span>{insight.label.replace(/^\d+\s+/, '')}</span></li>)}</ul> : <p>Everything is up to date.</p>}</section><section className="insight-card panel"><h2>Recently onboarded</h2><ul>{recent.map((client) => <li key={client.id}><span className="initial-avatar">{client.name.charAt(0)}</span><span>{client.name}<small>{new Date(client.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</small></span><StatusBadge status={client.status} /></li>)}</ul></section><section className="pro-tip panel"><strong>Pro tip</strong><p>A well-crafted profile helps clients make better connections.</p></section></div>
}
