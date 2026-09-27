import Image from 'next/image'
import Link from 'next/link'

import { PublicProfileMenu } from '@/components/public-profile-menu'
import { ProfileLinkList } from '@/components/profile-link-list'
import { DEFAULT_PROFILE_DESIGN, getProfileDesignDataAttributes, getProfileDesignStyle } from '@/lib/profile/design'
import { buildPublicProfileView } from '@/lib/profile/public-profile'
import { getLinkIcon } from '@/lib/profile/link-icons'
import type { NormalizedCoverPresentation, Profile, ProfileDesign } from '@/lib/profile/types'
import styles from './profile-templates.module.css'

type TemplateProps = {
  profile: Profile
  presentation: NormalizedCoverPresentation
  preview?: boolean
}

type ProfileView = ReturnType<typeof buildPublicProfileView>
type ViewLink = ProfileView['links'][number]

function cx(...names: Array<string | false | null | undefined>) {
  return names.filter(Boolean).join(' ')
}

function displayName(profile: Profile) {
  return profile.full_name.trim() || 'Your name'
}

function linkDetail(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'mailto:' ? 'Email' : parsed.hostname.replace(/^www\./, '')
  } catch {
    return 'Open link'
  }
}

function TemplateHeader({ profile, dark = false }: { profile: Profile; dark?: boolean }) {
  return <header className={cx(styles.header, dark && styles.headerDark)}>
    <Link className={styles.brand} data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</Link>
    <PublicProfileMenu slug={profile.slug} />
  </header>
}

function PreviewBadge({ preview, dark = false }: { preview: boolean; dark?: boolean }) {
  return preview ? <div className={cx(styles.previewBadge, dark && styles.previewBadgeDark)}>Private preview</div> : null
}

function ProfilePhoto({ profile, className, sizes }: { profile: Profile; className?: string; sizes: string }) {
  const name = displayName(profile)
  const view = buildPublicProfileView(profile)
  return <div className={cx(styles.photo, 'profile-template-photo', className, !profile.photo_url && 'profile-template-photo-fallback')} role={profile.photo_url ? undefined : 'img'} aria-label={profile.photo_url ? undefined : `${name} initials`}>
    {profile.photo_url ? <Image src={profile.photo_url} alt={`${name} profile photo`} fill sizes={sizes} /> : <span>{view.initials}</span>}
  </div>
}

function SaveContact({ profile, preview, pink = false, light = false }: { profile: Profile; preview: boolean; pink?: boolean; light?: boolean }) {
  const view = buildPublicProfileView(profile)
  const className = cx(styles.primaryAction, pink && styles.primaryActionPink, light && styles.primaryActionLight, preview && styles.disabled)
  const content = <>Save Contact<span aria-hidden="true">↓</span></>
  return preview ? <span className={className} aria-disabled="true">{content}</span> : <a className={className} href={view.saveContactHref}>{content}</a>
}

function ContactActions({ profile, light = false }: { profile: Profile; light?: boolean }) {
  const view = buildPublicProfileView(profile)
  const contacts = [
    view.callHref ? { label: 'Call', href: view.callHref } : null,
    view.emailHref ? { label: 'Email', href: view.emailHref } : null,
    view.whatsappHref ? { label: 'WhatsApp', href: view.whatsappHref } : null,
  ].filter((item): item is { label: string; href: string } => Boolean(item))
  if (!contacts.length) return null
  return <nav className={cx(styles.contactActions, light && styles.contactActionsLight)} aria-label={`Contact ${displayName(profile)}`}>
    {contacts.map((item) => <a key={item.label} href={item.href} target={item.href.startsWith('https:') ? '_blank' : undefined} rel={item.href.startsWith('https:') ? 'noopener noreferrer' : undefined}>{item.label}<span aria-hidden="true">↗</span></a>)}
  </nav>
}

function TemplateFooter({ design, dark = false }: { design: ProfileDesign; dark?: boolean }) {
  return <footer className={cx(styles.footer, dark && styles.footerDark)}>{design.footer.showMadeWithIq ? <span>Made with <strong>iq</strong></span> : null}{design.footer.showProfessionalLabel ? <span>Professional</span> : null}</footer>
}

function TextLinks({ links, design, card = false, light = false }: { links: ViewLink[]; design: ProfileDesign; card?: boolean; light?: boolean }) {
  return <ProfileLinkList links={links.map((link) => ({ ...link, detail: linkDetail(link.url) }))} design={design} className={cx(styles.textLinks, card && styles.textLinksCards, light && styles.textLinksLight)} />
}

function StudioProject({ link, design, featured = false, coverPath }: { link?: ViewLink; design: ProfileDesign; featured?: boolean; coverPath?: string | null }) {
  const icon = link ? getLinkIcon(link.label, link.url) : null
  const Icon = icon?.Icon
  const linksCustomized = design.effectiveLinkStyleFallback === true || JSON.stringify(design.links) !== JSON.stringify(DEFAULT_PROFILE_DESIGN.links)
  const className = cx(styles.project, featured && styles.projectFeatured, !link && styles.projectEmpty)
  const coverUrl = coverPath?.startsWith('/api/gift-media?') ? coverPath : coverPath ? `/api/profile-cover?path=${encodeURIComponent(coverPath)}` : null
  const content = <>
    <div className={styles.projectVisual}>
      {featured && coverUrl ? <Image src={coverUrl} alt="" fill sizes="(max-width: 760px) 100vw, 55vw" /> : <span aria-hidden="true">{link ? link.label.slice(0, 2).toUpperCase() : 'IQ'}</span>}
    </div>
    <div className={styles.projectCopy}>{link && design.links.showIcons && Icon ? <Icon data-link-icon={icon.key} aria-hidden="true" style={{ color: design.links.iconStyle === 'brand' ? icon.brandColor : undefined }} /> : null}<strong>{link?.label || 'Your selected work'}</strong><small>{link ? linkDetail(link.url) : 'Add links to feature your work here.'}</small></div>
    {link ? <span className={styles.projectArrow} aria-hidden="true">↗</span> : null}
  </>
  return link ? <a className={className} data-link-style={linksCustomized ? design.links.style : 'legacy'} data-link-density={design.links.density} href={link.url} target="_blank" rel="noopener noreferrer">{content}</a> : <article className={className}>{content}</article>
}

function StudioDesktop({ profile, presentation, preview }: Required<TemplateProps>) {
  const view = buildPublicProfileView(profile)
  return <section className={styles.desktop} data-composition="desktop">
    <aside className={styles.studioAside} data-profile-surface="primary">
      <TemplateHeader profile={profile} />
      <div className={cx(styles.identity, styles.reveal)} data-profile-identity>
        <ProfilePhoto profile={profile} className={styles.studioPhoto} sizes="116px" />
        <p className={styles.kicker}>Selected practice</p>
        <h1>{displayName(profile)}</h1>
        {profile.headline ? <h2>{profile.headline}</h2> : null}
        {profile.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
        {view.location ? <p className={styles.location}>{view.location}</p> : null}
      </div>
      <div className={styles.studioActions}><SaveContact profile={profile} preview={preview} /><ContactActions profile={profile} /></div>
    </aside>
    <div className={styles.studioWork} data-profile-surface="secondary">
      <div className={cx(styles.sectionHeading, styles.reveal)}><span>Portfolio / links</span><strong>Selected work</strong></div>
      <StudioProject link={view.links[0]} design={presentation.design} featured coverPath={presentation.cover.coverPath} />
      <div className={styles.projectGrid}>{(view.links.length ? view.links.slice(1) : []).map((link) => <StudioProject key={`${link.label}-${link.url}`} link={link} design={presentation.design} />)}</div>
      <TemplateFooter design={presentation.design} />
    </div>
  </section>
}

function StudioMobile({ profile, presentation, preview }: Required<TemplateProps>) {
  const view = buildPublicProfileView(profile)
  return <section className={styles.mobile} data-composition="mobile">
    <TemplateHeader profile={profile} />
    <div className={cx(styles.mobileIdentity, styles.reveal)} data-profile-identity><ProfilePhoto profile={profile} className={styles.mobileSquarePhoto} sizes="88px" /><div><h1>{displayName(profile)}</h1>{profile.headline ? <h2>{profile.headline}</h2> : null}</div></div>
    {profile.bio ? <p className={styles.mobileBio}>{profile.bio}</p> : null}
    <SaveContact profile={profile} preview={preview} />
    <ContactActions profile={profile} />
    <div className={styles.mobileSectionLabel}>Selected work</div>
    <StudioProject link={view.links[0]} design={presentation.design} featured coverPath={presentation.cover.coverPath} />
    <div className={styles.projectGrid}>{view.links.slice(1).map((link) => <StudioProject key={`${link.label}-${link.url}`} link={link} design={presentation.design} />)}</div>
    <TemplateFooter design={presentation.design} />
  </section>
}

export function StudioProfile({ profile, presentation, preview = false }: TemplateProps) {
  const props = { profile, presentation, preview }
  return <main className={cx(styles.shell, styles.studioShell, 'studio-profile', 'profile-design-root')} data-template="studio" style={getProfileDesignStyle(presentation.design)} {...getProfileDesignDataAttributes(presentation.design)}><PreviewBadge preview={preview} /><StudioDesktop {...props} /><StudioMobile {...props} /></main>
}

function ExecutiveDesktop({ profile, presentation, preview }: Required<TemplateProps>) {
  const view = buildPublicProfileView(profile)
  return <section className={styles.desktop} data-composition="desktop">
    <div className={styles.executivePortrait} data-profile-surface="primary"><TemplateHeader profile={profile} dark /><ProfilePhoto profile={profile} className={styles.executivePhoto} sizes="50vw" /><span>IQ / EXECUTIVE</span></div>
    <div className={cx(styles.executiveCopy, styles.reveal)} data-profile-identity data-profile-surface="secondary">
      <p className={styles.kicker}>Professional identity</p><h1>{displayName(profile)}</h1>
      {profile.headline ? <h2>{profile.headline}</h2> : null}
      {profile.tagline ? <p className={styles.tagline}>{profile.tagline}</p> : null}
      {profile.bio ? <p className={styles.executiveBio}>{profile.bio}</p> : null}
      {view.location ? <p className={styles.location}>{view.location}</p> : null}
      <div className={styles.executiveActions}><SaveContact profile={profile} preview={preview} /><ContactActions profile={profile} /></div>
      <TextLinks links={view.links} design={presentation.design} />
      <TemplateFooter design={presentation.design} />
    </div>
  </section>
}

function ExecutiveMobile({ profile, presentation, preview }: Required<TemplateProps>) {
  const view = buildPublicProfileView(profile)
  return <section className={styles.mobile} data-composition="mobile"><TemplateHeader profile={profile} />
    <ProfilePhoto profile={profile} className={cx(styles.executivePhoto, styles.reveal)} sizes="100vw" />
    <div className={styles.executiveMobileCopy} data-profile-identity><p className={styles.kicker}>Professional identity</p><h1>{displayName(profile)}</h1>{profile.headline ? <h2>{profile.headline}</h2> : null}{profile.tagline ? <p className={styles.tagline}>{profile.tagline}</p> : null}{profile.bio ? <p className={styles.executiveBio}>{profile.bio}</p> : null}{view.location ? <p className={styles.location}>{view.location}</p> : null}</div>
    <SaveContact profile={profile} preview={preview} /><ContactActions profile={profile} /><TextLinks links={view.links} design={presentation.design} /><TemplateFooter design={presentation.design} />
  </section>
}

export function ExecutiveProfile({ profile, presentation, preview = false }: TemplateProps) {
  const props = { profile, presentation, preview }
  return <main className={cx(styles.shell, styles.executiveShell, 'executive-profile', 'profile-design-root')} data-template="executive" style={getProfileDesignStyle(presentation.design)} {...getProfileDesignDataAttributes(presentation.design)}><PreviewBadge preview={preview} /><ExecutiveDesktop {...props} /><ExecutiveMobile {...props} /></main>
}

function SignalDesktop({ profile, presentation, preview }: Required<TemplateProps>) {
  const view = buildPublicProfileView(profile)
  const firstName = displayName(profile).split(/\s+/)[0]
  return <section className={styles.desktop} data-composition="desktop"><div className={styles.signalPage} data-profile-surface="primary"><TemplateHeader profile={profile} />
    <div className={styles.signalGrid}>
      <div className={cx(styles.signalTitle, styles.reveal)} data-profile-identity><p>Ideas / spaces / people</p><h1>{firstName}</h1>{profile.headline ? <h2>{profile.headline}</h2> : null}<SaveContact profile={profile} preview={preview} pink /><ContactActions profile={profile} /></div>
      <div className={styles.signalPortrait}><i aria-hidden="true" /><ProfilePhoto profile={profile} className={styles.signalPhoto} sizes="45vw" /></div>
    </div>
    <TextLinks links={view.links} design={presentation.design} card />
    <TemplateFooter design={presentation.design} />
  </div></section>
}

function SignalMobile({ profile, presentation, preview }: Required<TemplateProps>) {
  const view = buildPublicProfileView(profile)
  const firstName = displayName(profile).split(/\s+/)[0]
  return <section className={styles.mobile} data-composition="mobile"><TemplateHeader profile={profile} />
    <div className={cx(styles.signalMobileHero, styles.reveal)}><span>IDEAS<br />SPACES<br />PEOPLE</span><i aria-hidden="true" /><ProfilePhoto profile={profile} className={styles.signalPhoto} sizes="75vw" /></div>
    <h1 className={styles.signalMobileName}>{firstName}</h1>{profile.headline ? <h2 className={styles.signalMobileTitle}>{profile.headline}</h2> : null}
    <SaveContact profile={profile} preview={preview} pink /><ContactActions profile={profile} /><TextLinks links={view.links} design={presentation.design} card /><TemplateFooter design={presentation.design} />
  </section>
}

export function SignalProfile({ profile, presentation, preview = false }: TemplateProps) {
  const props = { profile, presentation, preview }
  return <main className={cx(styles.shell, styles.signalShell, 'signal-profile', 'profile-design-root')} data-template="signal" style={getProfileDesignStyle(presentation.design)} {...getProfileDesignDataAttributes(presentation.design)}><PreviewBadge preview={preview} /><SignalDesktop {...props} /><SignalMobile {...props} /></main>
}

function directoryGroups(profile: Profile) {
  const view = buildPublicProfileView(profile)
  const workPattern = /(work|portfolio|project|behance|dribbble|github|case study)/i
  const connectPattern = /(linkedin|instagram|facebook|twitter|threads|connect|contact)/i
  return {
    Connect: view.links.filter((link) => connectPattern.test(`${link.label} ${link.url}`)),
    Work: view.links.filter((link) => workPattern.test(`${link.label} ${link.url}`)),
    Elsewhere: view.links.filter((link) => !connectPattern.test(`${link.label} ${link.url}`) && !workPattern.test(`${link.label} ${link.url}`)),
  }
}

function Directory({ profile, design }: { profile: Profile; design: ProfileDesign }) {
  const groups = directoryGroups(profile)
  return <div className={styles.directory}>
    {Object.entries(groups).map(([name, links]) => links.length ? <section key={name}><h2>{name}</h2><TextLinks links={links} design={design} /></section> : null)}
  </div>
}

function IndexIdentity({ profile }: { profile: Profile }) {
  const view = buildPublicProfileView(profile)
  return <div className={styles.indexIdentity} data-profile-identity><ProfilePhoto profile={profile} className={styles.indexPhoto} sizes="104px" /><div><h1>{displayName(profile)}</h1>{profile.headline ? <h2>{profile.headline}</h2> : null}{profile.bio ? <p>{profile.bio}</p> : null}{view.location ? <small>{view.location}</small> : null}</div></div>
}

function IndexDesktop({ profile, presentation, preview }: Required<TemplateProps>) {
  return <section className={styles.desktop} data-composition="desktop"><aside className={styles.indexRail} data-profile-surface="primary"><TemplateHeader profile={profile} dark /><p>Everything,<br />in one place.</p><small>IQ DIRECTORY / 06</small></aside><div className={cx(styles.indexMain, styles.reveal)} data-profile-surface="secondary"><IndexIdentity profile={profile} /><div><SaveContact profile={profile} preview={preview} /><ContactActions profile={profile} /></div><Directory profile={profile} design={presentation.design} /><TemplateFooter design={presentation.design} /></div></section>
}

function IndexMobile({ profile, presentation, preview }: Required<TemplateProps>) {
  return <section className={styles.mobile} data-composition="mobile"><TemplateHeader profile={profile} /><div className={styles.reveal}><IndexIdentity profile={profile} /></div><SaveContact profile={profile} preview={preview} /><ContactActions profile={profile} /><Directory profile={profile} design={presentation.design} /><TemplateFooter design={presentation.design} /></section>
}

export function IndexProfile({ profile, presentation, preview = false }: TemplateProps) {
  const props = { profile, presentation, preview }
  return <main className={cx(styles.shell, styles.indexShell, 'index-profile', 'profile-design-root')} data-template="index" style={getProfileDesignStyle(presentation.design)} {...getProfileDesignDataAttributes(presentation.design)}><PreviewBadge preview={preview} /><IndexDesktop {...props} /><IndexMobile {...props} /></main>
}
