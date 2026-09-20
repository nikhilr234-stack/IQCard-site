import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PublicProfile } from './public-profile'
import type { CoverPresentation, Profile, ProfileTemplate } from '@/lib/profile/types'

const profile: Profile = {
  id: 'profile-1',
  owner_id: 'owner-1',
  slug: 'ada-lovelace',
  status: 'published',
  full_name: 'Ada Lovelace With A Deliberately Long Professional Name',
  headline: 'Mathematician and analytical engine researcher',
  tagline: 'Poetical science',
  bio: 'Writes about analytical engines and the future of computation.',
  phone: '+44 20 1234 5678',
  email: 'ada@example.com',
  whatsapp: '+44 7700 900123',
  location: 'London',
  public_email_visible: true,
  phone_visible: true,
  whatsapp_visible: false,
  location_visible: true,
  photo_path: null,
  photo_url: null,
  published_at: null,
  profile_links: [
    { id: 'portfolio', profile_id: 'profile-1', label: 'Selected work', url: 'https://example.com/work', sort_order: 2 },
    { id: 'linkedin', profile_id: 'profile-1', label: 'LinkedIn', url: 'https://linkedin.com/in/ada', sort_order: 1 },
  ],
}

function presentation(template: ProfileTemplate): CoverPresentation {
  return {
    template,
    cover: {
      coverPath: 'owner-1/real-cover.webp',
      overlay: 0.38,
      focalY: 50,
      alignment: 'lower-left',
      photoPathOverride: null,
    },
  }
}

describe('additional public profile templates', () => {
  it.each([
    ['studio', 'studio-profile'],
    ['executive', 'executive-profile'],
    ['signal', 'signal-profile'],
    ['index', 'index-profile'],
  ] as const)('renders %s with distinct desktop and mobile compositions', (template, className) => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={presentation(template)} />)

    expect(html).toContain(className)
    expect(html).toContain('data-composition="desktop"')
    expect(html).toContain('data-composition="mobile"')
    expect(html).toContain(profile.full_name)
    expect(html).toContain('https://linkedin.com/in/ada')
    expect(html).not.toContain('+44 7700 900123')
  })

  it('keeps actions inert in preview and renders deliberate empty-media fallbacks', () => {
    const emptyProfile = { ...profile, full_name: '', headline: '', bio: '', profile_links: [], photo_url: null }
    const html = renderToStaticMarkup(<PublicProfile profile={emptyProfile} presentation={presentation('executive')} preview />)

    expect(html).toContain('Your name')
    expect(html).toContain('profile-template-photo-fallback')
    expect(html).toContain('Save Contact')
    expect(html).not.toContain('/api/contact/ada-lovelace')
  })

  it('uses only saved profile links as Studio project destinations', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={presentation('studio')} />)

    expect(html).toContain('https://example.com/work')
    expect(html).toContain('https://linkedin.com/in/ada')
    expect(html).not.toContain('behance.net')
    expect(html).not.toContain('dribbble.com')
  })
})
