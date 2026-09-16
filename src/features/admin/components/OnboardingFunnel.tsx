export type FunnelStage = { label: string; count: number }

export function OnboardingFunnel({ stages }: { stages: readonly FunnelStage[] }) { const max = Math.max(...stages.map((stage) => stage.count), 1); return <article className="analytics-card panel"><header><h2>Onboarding funnel</h2><p>From invite to live profile.</p></header><ol className="funnel-list">{stages.map((stage) => <li key={stage.label}><span>{stage.label}</span><i><b style={{ width: `${(stage.count / max) * 100}%` }} /></i><strong>{stage.count}</strong></li>)}</ol></article> }
