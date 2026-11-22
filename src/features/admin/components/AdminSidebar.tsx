'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
const items = [['Clients', '◎'], ['Analytics', 'Ⅱ'], ['Templates', '▣'], ['Branding', '◇'], ['Settings', '⚙']] as const

export function AdminSidebar() {
  const [notes, setNotes] = useState('')

  useEffect(() => setNotes(window.localStorage.getItem('iq-admin-notes') ?? ''), [])

  function updateNotes(value: string) {
    setNotes(value)
    window.localStorage.setItem('iq-admin-notes', value)
  }

  return <div className="sidebar-inner"><a href="#top" className="iq-wordmark" aria-label="IQ Card admin home">iq</a><span className="sidebar-section-label">ADMIN</span><nav aria-label="Admin navigation" className="admin-nav"><Link href="/admin/print" className="admin-nav__item"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6z"/></svg><span className="admin-nav__label">Print desk</span></Link>{items.map(([label, icon]) => <button className={`admin-nav__item ${label === 'Clients' ? 'is-active' : ''}`} aria-current={label === 'Clients' ? 'page' : undefined} type="button" key={label}><span aria-hidden="true">{icon}</span><span className="admin-nav__label">{label}</span></button>)}</nav><section className="admin-notes"><div><span>PRIVATE NOTES</span><button type="button" aria-label="Clear admin notes" onClick={() => updateNotes('')}>Clear</button></div><textarea aria-label="Admin notes" value={notes} onChange={(event) => updateNotes(event.target.value)} placeholder="Your working notes…&#10;&#10;• What needs attention&#10;• Things to follow up" /></section><div className="sidebar-brand-card" aria-hidden="true"><div>iq</div><strong>Build smarter<br />connections.</strong><small>PHYSICAL IDENTITY FOR A MORE CONNECTED TOMORROW.</small></div><small className="sidebar-copyright">© 2026 IQ Card.</small></div>
}
