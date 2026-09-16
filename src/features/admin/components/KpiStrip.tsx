export type Kpi = { label: string; value: string | number; icon: string }

export function KpiStrip({ items }: { items: readonly Kpi[] }) { return <section className="kpi-strip" aria-label="Client overview metrics">{items.map((item) => <article className="kpi-card" key={item.label}><span aria-hidden="true">{item.icon}</span><div><strong>{item.value}</strong><small>{item.label}</small></div></article>)}</section> }
