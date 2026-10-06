'use client'

import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import Image from 'next/image'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { CoverPresentation, Profile } from '@/lib/profile/types'
import { trapDialogFocus } from '@/lib/browser/focus-trap'
import { publicProfileUrl } from '@/lib/site-routing'
import { parseSavedCardDesign, type SavedDesign } from '@/lib/dashboard/saved-card'
import { greetingForHour } from '@/lib/dashboard/greeting'
import { SavedCardRenderer } from './saved-card-renderer'

type Props = { profile: Profile; presentation: CoverPresentation; savedDesign: SavedDesign; siteUrl: string; onEditDetails: () => void }

const subscribeToLocalClock = () => () => {}
const serverGreeting = () => 'Good morning'
const clientGreeting = () => greetingForHour(new Date().getHours())

function profilePhotoUrl(profile: Profile, photoPathOverride: string | null) {
  if (!photoPathOverride || photoPathOverride === profile.photo_path) return profile.photo_url ?? null
  if (photoPathOverride.startsWith('/api/gift-media?')) return photoPathOverride
  return `/api/profile-photo?path=${encodeURIComponent(photoPathOverride)}`
}

export function LiveOwnerCenter({ profile, presentation, savedDesign, siteUrl, onEditDetails }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const greeting = useSyncExternalStore(subscribeToLocalClock, clientGreeting, serverGreeting)
  const drawer = useRef<HTMLElement | null>(null)
  const drawerClose = useRef<HTMLButtonElement | null>(null)
  const drawerOpener = useRef<HTMLElement | null>(null)
  const card = parseSavedCardDesign(savedDesign)
  const url = publicProfileUrl(siteUrl, profile.slug)
  const displayUrl = url.replace(/^https?:\/\//, '')
  const firstName = profile.full_name.trim().split(/\s+/)[0] || 'there'
  const links = profile.profile_links
  const coverUrl = presentation.template === 'cover' && presentation.cover.coverPath
    ? presentation.cover.coverPath.startsWith('/api/gift-media?') ? presentation.cover.coverPath : `/api/profile-cover?path=${encodeURIComponent(presentation.cover.coverPath)}`
    : null
  const photoUrl = profilePhotoUrl(profile, presentation.cover.photoPathOverride)
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setNotice('Public link copied.') }
    catch { setNotice(url) }
  }
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: `${profile.full_name} — IQ Card`, url }) } catch {} }
    else await copy()
  }
  useEffect(() => {
    if (!drawerOpen) return
    drawerClose.current?.focus()
    return () => {
      const opener = drawerOpener.current
      if (opener?.isConnected) opener.focus()
      drawerOpener.current = null
    }
  }, [drawerOpen])
  const openDrawer = (event: React.MouseEvent<HTMLButtonElement>) => {
    drawerOpener.current = event.currentTarget
    setDrawerOpen(true)
  }
  const closeDrawer = () => setDrawerOpen(false)
  return <main className="owner-center" id="overview">
    <header className="owner-center-topbar"><Link href="/" className="owner-center-brand"><b>iq</b><span><strong>Your dashboard</strong><small>LIVE OWNER CENTER</small></span></Link><nav className="owner-center-nav" aria-label="Dashboard navigation"><a href="#overview">Overview</a><a href="#analytics">Analytics</a><a href="#content">Content</a><a href="#spaces">Spaces</a><a href="#updates">Updates</a></nav><div className="owner-center-actions"><span className="owner-live"><i />LIVE</span><Link href="/dashboard/digital-profile">Digital Profile</Link><button type="button" onClick={openDrawer}>Customize</button><button type="button" className="owner-dark" onClick={share}>Share</button><SignOutButton /></div></header>
    <section className="owner-center-hero"><div><h1>{greeting},<span>{firstName}.</span></h1><p>A more connected you.<br />Everything you need, in one place.</p></div><div className="owner-hero-meta"><strong>{displayUrl}</strong><span>Everything is live. Everything is still editable.</span><div><button type="button" onClick={onEditDetails}>✎ Edit details</button><button type="button" onClick={copy}>⌁ Copy link</button></div></div></section>
    <section className="owner-center-feature-grid"><article className="owner-panel owner-identity-panel"><PanelHead kicker="YOUR IQ" title="Your identity." action={<Link href="/dashboard/digital-profile">Edit Digital Profile ↗</Link>} /><div className={`owner-profile-preview${coverUrl ? ' owner-profile-preview--cover' : ''}`}><div className="owner-profile-cover" style={coverUrl ? { backgroundImage: `url("${coverUrl}")`, backgroundPosition: `center ${presentation.cover.focalY}%` } : undefined} /><div className="owner-profile-cover-overlay" style={{ opacity: coverUrl ? presentation.cover.overlay : 0 }} /><div className="owner-profile-head"><b>iq</b><span>PUBLIC PROFILE</span></div><div className={`owner-profile-copy${photoUrl ? ' has-photo' : ''}`}>{photoUrl ? <div className="owner-profile-photo"><Image src={photoUrl} alt="" fill sizes="64px" unoptimized /></div> : null}<small>PUBLIC PROFILE</small><h2>{profile.full_name}</h2><p>{profile.headline || 'Your IQ is live.'}</p><em>{profile.bio || 'Add your story from Edit details.'}</em><div>{links.slice(0, 4).map(link => <span key={link.id}>{link.label}</span>)}</div></div></div><Link className="owner-profile-public-link" href={`/${profile.slug}`} target="_blank">View public profile ↗</Link></article><article className="owner-panel owner-card-panel"><PanelHead kicker="YOUR PHYSICAL IQ" title="A card that opens doors." action={<button type="button" onClick={openDrawer}>Customize card ↗</button>} /><div className="owner-card-stage"><SavedCardRenderer card={card} /></div><div className="owner-card-meta"><span>{card.available ? `${card.material ?? 'Saved'} · ${card.finish ?? 'configured'}` : 'Saved design'}</span><span>{savedDesign?.design_id ?? 'Card configuration'}</span></div></article></section>
    <section className="owner-center-grid"><article className="owner-module" id="analytics"><PanelHead kicker="ANALYTICS" title="" action={<span>Last 7 days</span>} /><div className="owner-empty"><strong>No analytics yet</strong><p>Views, taps, and link activity will appear here when tracking is connected.</p></div></article><article className="owner-module" id="content"><PanelHead kicker="CONTENT" title="" action={<Link href="/dashboard/digital-profile#links">Manage ↗</Link>} /><div className="owner-content-number"><strong>{links.length}</strong><span>item{links.length === 1 ? '' : 's'}</span></div>{links.length ? <div className="owner-link-list">{links.slice(0, 4).map(link => <a href={link.url} key={link.id} target="_blank" rel="noreferrer"><i>↗</i><span><b>{link.label}</b><small>{link.url}</small></span></a>)}</div> : <div className="owner-empty"><strong>No content yet</strong><p>Add links from Manage.</p></div>}</article><article className="owner-module" id="spaces"><PanelHead kicker="SPACES" title="" /><div className="owner-empty"><strong>Spaces are coming soon</strong><p>Organize different parts of your identity when this feature launches.</p></div></article><article className="owner-module" id="updates"><PanelHead kicker="REQUESTS &amp; UPDATES" title="" /><div className="owner-empty"><strong>No activity yet</strong><p>Your profile is live. Future card taps and connection activity will appear here.</p></div></article><article className="owner-module owner-quick"><PanelHead kicker="QUICK ACTIONS" title="" /><button type="button" onClick={onEditDetails}>Update profile <span>›</span></button><Link href="/dashboard/digital-profile#links">Add content <span>›</span></Link><button type="button" onClick={openDrawer}>Manage card <span>›</span></button></article><article className="owner-module owner-share"><PanelHead kicker="SHARE &amp; QR" title="" /><span>Your public link</span><div><strong>{displayUrl}</strong><button type="button" onClick={copy}>⧉</button></div><p>Share one address for your card and public profile.</p></article><article className="owner-module owner-card-summary"><PanelHead kicker="CARD ATELIER" title="" /><div className="owner-summary-card"><SavedCardRenderer card={card} variant="compact" /><span><b>{card.available ? 'Connected' : 'Review design'}</b><small>{card.available ? 'Your exact saved card is ready.' : 'Open the Atelier to review your card.'}</small></span></div><button type="button" onClick={openDrawer}>Manage card →</button></article><article className="owner-module owner-editorial"><h3>Make your<br />identity sharper.</h3><p>Keep building. Your next opportunity is one connection away.</p><button type="button" onClick={onEditDetails} aria-label="Edit profile">→</button></article></section>
    <footer className="owner-footer"><b>iq</b><span>IQ Card&nbsp; · &nbsp;A more connected you.</span><span>Built for a more open world.</span></footer>
    <p className="owner-notice" role="status" aria-live="polite">{notice}</p>
    {drawerOpen && <div className="owner-drawer-backdrop" onClick={closeDrawer}><aside className="owner-drawer" ref={drawer} role="dialog" aria-modal="true" aria-label="Card management" tabIndex={-1} onClick={event => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') closeDrawer(); else if (drawer.current) trapDialogFocus(drawer.current, event) }}><button className="owner-drawer-close" ref={drawerClose} type="button" onClick={closeDrawer} aria-label="Close card management">×</button><b>iq</b><h2>Refine your card.</h2><p>Your dashboard preserves the exact object saved in the Atelier.</p><SavedCardRenderer card={card} /><dl><div><dt>Material</dt><dd>{card.available ? card.material ?? 'Saved material' : 'Unavailable'}</dd></div><div><dt>Finish</dt><dd>{card.available ? card.finish ?? 'Saved finish' : 'Unavailable'}</dd></div><div><dt>Design</dt><dd>{savedDesign?.design_id ?? 'Unavailable'}</dd></div></dl><Link className="owner-dark owner-drawer-link" href={card.available ? `/customize?resume=1&design=${encodeURIComponent(card.designId)}` : "/customize"}>Open full Atelier →</Link></aside></div>}
  </main>
}

function PanelHead({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) { return <header className="owner-panel-head"><div><small>{kicker}</small>{title ? <h2>{title}</h2> : null}</div>{action}</header> }
