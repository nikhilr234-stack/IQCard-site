import Link from 'next/link'
import Image from 'next/image'

import { PublicProfileMenu } from '@/components/public-profile-menu'
import { buildPublicProfileView } from '@/lib/profile/public-profile'
import { ProfileLinkList } from '@/components/profile-link-list'
import { getProfileDesignDataAttributes, getProfileDesignStyle } from '@/lib/profile/design'
import type { NormalizedCoverPresentation, Profile } from '@/lib/profile/types'

export function PublicProfileCard({ profile, presentation, preview = false }: { profile: Profile; presentation: NormalizedCoverPresentation; preview?: boolean }) {
  const view = buildPublicProfileView(profile)
  const displayName = profile.full_name || 'Your name'

  return <main className="public-profile-shell profile-design-root" data-template="minimal" style={getProfileDesignStyle(presentation.design)} {...getProfileDesignDataAttributes(presentation.design)}>
    <div className="public-profile-page">
      {preview ? <div className="public-preview-badge">Private preview</div> : null}
      <header className="public-profile-topbar">
        <Link className="public-profile-brand" data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</Link>
        <PublicProfileMenu slug={profile.slug} />
      </header>

      <section className="public-profile-hero" aria-labelledby="profile-name">
        <div className="public-profile-identity" data-profile-identity>
          <p className="public-profile-eyebrow">Professional</p>
          <h1 id="profile-name">{displayName}</h1>
          {profile.headline ? <p className="public-profile-role">{profile.headline}</p> : null}
          {profile.tagline ? <p className="public-profile-tagline">{profile.tagline}</p> : null}
          {profile.bio ? <p className="public-profile-bio">{profile.bio}</p> : null}
          {view.location ? <p className="public-profile-location">{view.location}</p> : null}

          <div className="public-profile-actions">
            {preview ? <span className="public-profile-pill is-disabled">Save Contact<span aria-hidden="true">→</span></span> : <a className="public-profile-pill" href={view.saveContactHref}>Save Contact<span aria-hidden="true">→</span></a>}
          </div>

          <ProfileLinkList links={view.links} design={presentation.design} className="public-profile-links" linkClassName="public-profile-pill" />

          {view.callHref || view.emailHref || view.whatsappHref ? <nav className="public-profile-contact-actions" aria-label={`Contact ${displayName}`}>
            {view.callHref ? <a href={view.callHref}>Call</a> : null}
            {view.emailHref ? <a href={view.emailHref}>Email</a> : null}
            {view.whatsappHref ? <a href={view.whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a> : null}
          </nav> : null}
        </div>

        <div className="public-profile-portrait-wrap">
          <div className={`public-profile-portrait${profile.photo_url ? ' has-photo' : ''}`} role={profile.photo_url ? undefined : 'img'} aria-label={profile.photo_url ? undefined : `${displayName} initials`}>
            {profile.photo_url ? <Image src={profile.photo_url} alt={`${displayName} profile photo`} fill sizes="(max-width: 680px) 116px, 238px" /> : <span>{view.initials}</span>}
          </div>
          <div className="public-profile-portrait-note"><span>IQ Identity</span><span>{displayName}</span></div>
        </div>
      </section>

      <footer className="public-profile-footer">
        {presentation.design.footer.showMadeWithIq ? <span className="public-profile-made">Made with <strong>iq</strong></span> : null}
        {presentation.design.footer.showProfessionalLabel ? <span className="public-profile-mode"><i aria-hidden="true" />Professional</span> : null}
      </footer>
    </div>
  </main>
}
