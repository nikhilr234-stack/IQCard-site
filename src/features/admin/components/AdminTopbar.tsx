import type { ClientStatus } from '../types'

const statuses: Array<ClientStatus | 'All'> = ['All', 'Live', 'Draft', 'Invited', 'No profile']

export function AdminTopbar({ query, status, onQueryChange, onStatusChange }: { query: string; status: ClientStatus | 'All'; onQueryChange: (value: string) => void; onStatusChange: (value: ClientStatus | 'All') => void }) {
  return <div className="topbar-inner"><label className="global-search"><span aria-hidden="true">⌕</span><span className="sr-only">Search clients</span><input type="search" aria-label="Search clients" placeholder="Search clients by name, email, or segment..." value={query} onChange={(event) => onQueryChange(event.target.value)} /><kbd>⌘ K</kbd></label><div className="topbar-actions"><label className="utility-select"><span className="sr-only">Filter by status</span><select aria-label="Filter by status" value={status} onChange={(event) => onStatusChange(event.target.value as ClientStatus | 'All')}>{statuses.map((item) => <option key={item}>{item === 'All' ? 'All clients' : item}</option>)}</select></label><span className="account-avatar" aria-label="Admin account">A</span></div></div>
}
