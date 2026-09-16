import type { ClientStatus } from '../types'
import { StatusBadge } from './StatusBadge'

export function StatusDonut({ items }: { items: Record<ClientStatus, number> }) {
  const entries = Object.entries(items) as Array<[ClientStatus, number]>
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  let cursor = 0
  const gradient = entries.map(([, count], index) => { const start = cursor; cursor += total ? (count / total) * 100 : 0; return `var(--donut-${index}) ${start}% ${cursor}%` }).join(', ')
  return <article className="analytics-card panel"><header><h2>Client status breakdown</h2></header><div className="donut-layout"><div className="donut" role="img" aria-label={`Client status breakdown for ${total} clients`} style={{ background: `conic-gradient(${gradient})` }}><span><strong>{total}</strong><small>clients</small></span></div><ul>{entries.map(([label, count]) => <li key={label}><StatusBadge status={label} /><b>{count}</b></li>)}</ul></div></article>
}
