import Link from 'next/link'
import Image from 'next/image'

import { PublicProfileMenu } from '@/components/public-profile-menu'
import { buildPublicProfileView } from '@/lib/profile/public-profile'
import type { Profile } from '@/lib/profile/types'

export function PublicProfileCard({ profile, preview = false }: { profile: Profile; preview?: boolean }) {
  const view = buildPublicProfileView(profile)
  const displayName = profile.full_name || 'Your name'

  return <main className="public-profile-shell">
    <div className="public-profile-page">
      {preview ? <div className="public-preview-badge">Private preview</div> : null}
      <header className="public-profile-topbar">
        <Link className="public-profile-brand" data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</Link>
        <PublicProfileMenu slug={profile.slug} />
      </header>

      <section className="public-profile-hero" aria-labelledby="profile-name">
        <div className="public-profile-identity">
          <p className="public-profile-eyebrow">Professional</p>
          <h1 id="profile-name">{displayName}</h1>
          {profile.headline ? <p className="public-profile-role">{profile.headline}</p> : null}
          {profile.tagline ? <p className="public-profile-tagline">{profile.tagline}</p> : null}
          {profile.bio ? <p className="public-profile-bio">{profile.bio}</p> : null}
          {view.location ? <p className="public-profile-location">{view.location}</p> : null}

          <div className="public-profile-actions">
            {preview ? <span className="public-profile-pill is-disabled">Save Contact<span aria-hidden="true">→</span></span> : <a className="public-profile-pill" href={view.saveContactHref}>Save Contact<span aria-hidden="true">→</span></a>}
          </div>

          {view.links.length ? <div className="public-profile-links" aria-label="Profile links">
            {view.links.map((link) => <a className="public-profile-pill" key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer"><span>{link.label}</span><span aria-hidden="true">↗</span></a>)}
          </div> : null}

          {view.callHref || view.emailHref || view.whatsappHref ? <nav className="public-profile-contact-actions" aria-label={`Contact ${displayName}`}>
            {view.callHref ? <a href={view.callHref}>Call</a> : null}
            {view.emailHref ? <a href={view.emailHref}>Email</a> : null}
            {view.whatsappHref ? <a href={view.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
          </nav> : null}
        </div>

        <div className="public-profile-portrait-wrap">
          <div className={`public-profile-portrait${profile.photo_url ? ' has-photo' : ''}`} role={profile.photo_url ? undefined : 'img'} aria-label={profile.photo_url ? undefined : `${displayName} initials`}>
            {profile.photo_url ? <Image src={profile.photo_url} alt={`${displayName} profile photo`} fill sizes="(max-width: 680px) 116px, 238px" unoptimized /> : <span>{view.initials}</span>}
          </div>
          <div className="public-profile-portrait-note"><span>IQ Identity</span><span>{displayName}</span></div>
        </div>
      </section>

      <footer className="public-profile-footer">
        <span className="public-profile-made">Made with <strong>iq</strong></span>
        <span className="public-profile-mode"><i aria-hidden="true" />Professional</span>
      </footer>
    </div>
  </main>
}
