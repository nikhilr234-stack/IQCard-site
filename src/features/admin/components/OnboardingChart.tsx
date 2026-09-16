export type OnboardingPoint = { date: string; joined: number; live: number }

export function OnboardingChart({ points }: { points: readonly OnboardingPoint[] }) {
  const max = Math.max(...points.map((point) => point.joined), 1)
  const coordinates = points.map((point, index) => `${8 + (index / Math.max(points.length - 1, 1)) * 84},${86 - (point.joined / max) * 64}`).join(' ')
  return <article className="analytics-card panel"><header><div><h2>Client onboarding over time</h2><p>New clients, grouped by joined date.</p></div></header><svg viewBox="0 0 100 100" role="img" aria-label="Client onboarding over time line chart"><line x1="8" y1="22" x2="92" y2="22" /><line x1="8" y1="54" x2="92" y2="54" /><line x1="8" y1="86" x2="92" y2="86" /><polyline points={coordinates} fill="none" />{points.map((point, index) => <circle key={point.date} cx={8 + (index / Math.max(points.length - 1, 1)) * 84} cy={86 - (point.joined / max) * 64} r="1.8"><title>{`${point.date}: ${point.joined} joined`}</title></circle>)}</svg></article>
}
