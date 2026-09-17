import type { DashboardView } from '../types'

export type Kpi = { label: string; value: string | number; icon: string; view: DashboardView }

export function KpiStrip({ items, onSelect }: { items: readonly Kpi[]; onSelect: (view: DashboardView) => void }) { return <section className="kpi-strip" aria-label="Client overview metrics">{items.map((item) => <button className="kpi-card" type="button" key={item.label} onClick={() => onSelect(item.view)}><span aria-hidden="true">{item.icon}</span><div><strong>{item.value}</strong><small>{item.label}</small></div></button>)}</section> }
