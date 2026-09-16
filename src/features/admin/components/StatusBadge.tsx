import type { ClientStatus } from '../types'

export function StatusBadge({ status }: { status: ClientStatus }) {
  return <span className={`status-badge status-badge--${status.toLowerCase().replaceAll(' ', '-')}`}><i aria-hidden="true" />{status}</span>
}
