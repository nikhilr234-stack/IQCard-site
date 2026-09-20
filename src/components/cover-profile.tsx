import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'

import { buildPublicProfileView } from '@/lib/profile/public-profile'
import type { CoverPresentation, Profile } from '@/lib/profile/types'

type CoverProfileProps = {
  profile: Profile
  presentation: CoverPresentation
  preview?: boolean
}

type CoverStyle = CSSProperties & {
  '--cover-focal-y'?: string
  '--cover-overlay'?: number
}

function profilePhotoUrl(profile: Profile, photoPathOverride: string | null) {
  if (!photoPathOverride || photoPathOverride === profile.photo_path) return profile.photo_url ?? null
  return `/api/profile-photo?path=${encodeURIComponent(photoPathOverride)}`
}

export function CoverProfile({ profile, presentation, preview = false }: CoverProfileProps) {
  const view = buildPublicProfileView(profile)
  const displayName = profile.full_name || 'Your name'
  const { cover } = presentation
  const coverUrl = cover.coverPath ? `/api/profile-cover?path=${encodeURIComponent(cover.coverPath)}` : null
  const photoUrl = profilePhotoUrl(profile, cover.photoPathOverride)
  const style: CoverStyle = {
    '--cover-overlay': cover.overlay,
    '--cover-focal-y': `${cover.focalY}%`,
  }

  return <main className={`cover-profile-shell cover-profile--${cover.alignment}`} style={style}>
    <div
      className={`cover-profile-wallpaper${coverUrl ? '' : ' is-fallback'}`}
      aria-hidden="true"
      style={coverUrl ? { backgroundImage: `url("${coverUrl}")` } : undefined}
    />
    <div className="cover-profile-overlay" aria-hidden="true" />

    <div className="cover-profile-page">
      {preview ? <div className="cover-preview-badge">Private preview</div> : null}
      <header className="cover-profile-topbar">
        <Link className="cover-profile-brand" data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</Link>
      </header>

      <section className="cover-profile-lower-third" aria-labelledby="cover-profile-name">
        <div className={`cover-profile-identity${photoUrl ? ' has-photo' : ''}`}>
          <div className="cover-profile-photo" role={photoUrl ? undefined : 'img'} aria-label={photoUrl ? undefined : `${displayName} initials`}>
            {photoUrl ? <Image src={photoUrl} alt={`${displayName} profile photo`} fill sizes="96px" /> : <span>{view.initials}</span>}
          </div>
          <div className="cover-profile-nameplate">
            <h1 id="cover-profile-name">{displayName}</h1>
            {profile.headline ? <p className="cover-profile-role">{profile.headline}</p> : null}
            {profile.tagline ? <p className="cover-profile-tagline">{profile.tagline}</p> : null}
            {view.location ? <p className="cover-profile-location">{view.location}</p> : null}
          </div>
        </div>

        <div className="cover-profile-content">
          {profile.bio ? <p className="cover-profile-bio">{profile.bio}</p> : null}
          <div className="cover-profile-actions">
            {preview ? <span className="cover-profile-save is-disabled">Save Contact<span aria-hidden="true">↓</span></span> : <a className="cover-profile-save" href={view.saveContactHref}>Save Contact<span aria-hidden="true">↓</span></a>}
          </div>

          {view.links.length ? <nav className="cover-profile-links" aria-label="Profile links">
            {view.links.map((link) => <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer"><span>{link.label}</span><span aria-hidden="true">↗</span></a>)}
          </nav> : null}

          {view.callHref || view.emailHref || view.whatsappHref ? <nav className="cover-profile-contact-actions" aria-label={`Contact ${displayName}`}>
            {view.callHref ? <a href={view.callHref}>Call</a> : null}
            {view.emailHref ? <a href={view.emailHref}>Email</a> : null}
            {view.whatsappHref ? <a href={view.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
          </nav> : null}
        </div>
      </section>

      <footer className="cover-profile-footer"><span>Made with <strong>iq</strong></span><span className="cover-profile-footer-actions"><Link href="/customize">Design yours →</Link><span>Professional</span></span></footer>
    </div>
  </main>
}
