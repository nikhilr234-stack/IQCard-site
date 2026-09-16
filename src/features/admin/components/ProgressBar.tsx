export function ProgressBar({ value, label }: { value: number; label: string }) {
  return <span className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)}><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>
}
