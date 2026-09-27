import { getLinkIcon } from '@/lib/profile/link-icons'
import { DEFAULT_PROFILE_DESIGN } from '@/lib/profile/design'
import type { ProfileDesign } from '@/lib/profile/types'

export type ProfileLinkListItem = { label: string; url: string; detail?: string }

export function ProfileLinkList({
  links,
  design,
  className,
  linkClassName,
  label = 'Profile links',
}: {
  links: ProfileLinkListItem[]
  design: ProfileDesign
  className?: string
  linkClassName?: string
  label?: string
}) {
  if (!links.length) return null
  const linksCustomized = design.effectiveLinkStyleFallback === true || JSON.stringify(design.links) !== JSON.stringify(DEFAULT_PROFILE_DESIGN.links)

  return <nav
    className={['profile-link-list', className].filter(Boolean).join(' ')}
    aria-label={label}
    data-link-style={linksCustomized ? design.links.style : 'legacy'}
    data-link-density={design.links.density === DEFAULT_PROFILE_DESIGN.links.density ? undefined : design.links.density}
    data-link-radius={design.links.radius === DEFAULT_PROFILE_DESIGN.links.radius ? undefined : design.links.radius}
    data-show-icons={design.links.showIcons ? 'true' : undefined}
    data-icon-style={design.links.iconStyle}
  >
    {links.map((link) => {
      const icon = getLinkIcon(link.label, link.url)
      const Icon = icon.Icon
      return <a className={linkClassName} key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={design.links.style === 'icons' ? link.label : undefined}>
        {design.links.showIcons ? <Icon className="profile-link-icon" data-link-icon={icon.key} aria-hidden="true" style={{ color: design.links.iconStyle === 'brand' ? icon.brandColor : undefined }} /> : null}
        <span className="profile-link-label">{link.label || 'Link'}{link.detail ? <small>{link.detail}</small> : null}</span>
        {design.links.style !== 'icons' ? <span className="profile-link-arrow" aria-hidden="true">↗</span> : null}
      </a>
    })}
  </nav>
}
