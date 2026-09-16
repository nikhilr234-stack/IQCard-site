const items = [['Clients', '◎'], ['Analytics', 'Ⅱ'], ['Templates', '▣'], ['Branding', '◇'], ['Settings', '⚙']] as const

export function AdminSidebar() {
  return <div className="sidebar-inner"><a href="#top" className="iq-wordmark" aria-label="IQ Card admin home">iq</a><span className="sidebar-section-label">ADMIN</span><nav aria-label="Admin navigation" className="admin-nav">{items.map(([label, icon]) => <button className={`admin-nav__item ${label === 'Clients' ? 'is-active' : ''}`} aria-current={label === 'Clients' ? 'page' : undefined} type="button" key={label}><span aria-hidden="true">{icon}</span><span className="admin-nav__label">{label}</span></button>)}</nav><div className="sidebar-brand-card" aria-hidden="true"><div>iq</div><strong>Build smarter<br />connections.</strong><small>PHYSICAL IDENTITY FOR A MORE CONNECTED TOMORROW.</small></div><small className="sidebar-copyright">© 2026 IQ Card.</small></div>
}
