import type { ReactNode } from 'react'

export function AdminShell({ sidebar, topbar, children, insightRail }: { sidebar: ReactNode; topbar: ReactNode; children: ReactNode; insightRail: ReactNode }) {
  return <div className="admin-shell"><aside className="admin-shell__sidebar">{sidebar}</aside><header className="admin-shell__topbar">{topbar}</header><main className="admin-shell__main">{children}</main><aside className="admin-shell__insights" aria-label="Client insights">{insightRail}</aside></div>
}
