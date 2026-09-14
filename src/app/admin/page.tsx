import Link from 'next/link'
import { requireAdminAccount } from '@/lib/auth/account'
import { listAdminClients } from '@/lib/admin/repository'
import { adminActionMessage } from '@/lib/admin/messages'
import { onboardClient, resendClientInvite, setClientPublication } from '@/app/actions/admin'

export const dynamic = 'force-dynamic'

const dateFormatter = new Intl.DateTimeFormat('en', { dateStyle: 'medium' })

type AdminPageProps = {
  searchParams: Promise<{ error?: string }>
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  const account = await requireAdminAccount()
  const clients = await listAdminClients()
  const errorMessage = adminActionMessage(params.error)

  return <main className="admin-shell"><header className="dashboard-header"><div><span className="eyebrow">IQ CARD ADMIN</span><h1>Clients</h1><p>Signed in as {account.email}</p></div><Link className="ghost-button" href="/dashboard">My profile</Link></header>{errorMessage ? <p role="alert">{errorMessage}</p> : null}<section className="admin-grid"><section className="panel"><div className="panel-heading"><div><span className="eyebrow">ONBOARD</span><h2>Add a client</h2></div></div><p className="admin-copy">They’ll receive a secure magic link and start with a private draft profile.</p><form action={onboardClient} className="admin-form"><label>Client email<input name="email" type="email" placeholder="client@example.com" required /></label><label>Client name <span className="muted-label">(optional)</span><input name="full_name" placeholder="Suggested from email if blank" /></label><button className="primary-button" type="submit">Send access link</button></form></section><section className="panel admin-summary"><span className="eyebrow">OVERVIEW</span><strong>{clients.length}</strong><p>client{clients.length === 1 ? '' : 's'} onboarded</p></section></section><section className="panel clients-panel"><div className="panel-heading"><div><span className="eyebrow">DIRECTORY</span><h2>All clients</h2></div><span className="link-count">{clients.length}</span></div>{clients.length === 0 ? <p className="empty-state">No clients yet. Use the onboarding form to add the first one.</p> : <div className="client-table"><div className="client-row client-row-head"><span>Client</span><span>Profile</span><span>Joined</span><span>Actions</span></div>{clients.map((client) => { const profile = client.profile; return <div className="client-row" key={client.id}><div><strong>{profile?.full_name || client.email.split('@')[0]}</strong><small>{client.email}</small></div><div>{profile ? <><span className={`status-pill ${profile.status}`}>{profile.status === 'published' ? 'Live' : 'Draft'}</span><small>/{profile.slug}</small></> : <span className="muted-label">No profile</span>}</div><small>{dateFormatter.format(new Date(client.created_at))}</small><div className="client-actions">{profile?.status === 'published' ? <a href={`/${profile.slug}`} target="_blank" rel="noopener noreferrer">View</a> : null}{profile ? <form action={setClientPublication}><input type="hidden" name="profile_id" value={profile.id} /><input type="hidden" name="status" value={profile.status === 'published' ? 'draft' : 'published'} /><button className="text-button" type="submit">{profile.status === 'published' ? 'Unpublish' : 'Publish'}</button></form> : null}<form action={resendClientInvite}><input type="hidden" name="client_id" value={client.id} /><button className="text-button" type="submit">Resend link</button></form></div></div> })}</div>}</section></main>
}
