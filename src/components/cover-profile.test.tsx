import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PublicProfile } from './public-profile'
import type { CoverPresentation, Profile } from '@/lib/profile/types'

const profile: Profile = {
  id: 'profile-1',
  owner_id: 'owner-1',
  slug: 'ada-lovelace',
  status: 'published',
  full_name: 'Ada Lovelace',
  headline: 'Mathematician',
  tagline: 'The first programmer',
  bio: 'Writes analytical engines.',
  phone: '+44 20 1234 5678',
  email: 'ada@example.com',
  whatsapp: '+44 7700 900123',
  location: 'London',
  public_email_visible: true,
  phone_visible: true,
  whatsapp_visible: true,
  location_visible: true,
  photo_path: null,
  photo_url: null,
  published_at: null,
  profile_links: [
    { id: 'linkedin', profile_id: 'profile-1', label: 'LinkedIn', url: 'https://linkedin.com/in/ada', sort_order: 1 },
    { id: 'unsafe', profile_id: 'profile-1', label: 'Unsafe', url: 'javascript:alert(1)', sort_order: 2 },
  ],
}

const cover: CoverPresentation = {
  template: 'cover',
  cover: {
    coverPath: 'owner-1/ada-cover.webp',
    overlay: 0.56,
    focalY: 68,
    alignment: 'lower-left',
    photoPathOverride: null,
  },
}

describe('PublicProfile', () => {
  it('renders the published Cover presentation and keeps Save Contact inert in preview', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={cover} preview />)

    expect(html).toContain('cover-profile-shell')
    expect(html).toContain('Save Contact')
    expect(html).not.toContain('/api/contact/ada-lovelace')
    expect(html).toContain('https://linkedin.com/in/ada')
    expect(html).not.toContain('javascript:alert')
  })

  it('preloads the published wallpaper from its public-only media URL', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={cover} />)

    expect(html).toContain('imageSrcSet="/_next/image?url=%2Fapi%2Fprofile-cover%3Fpath%3Downer-1%252Fada-cover.webp%26published%3D1')
    expect(html).toContain('rel="preload" as="image"')
    expect(html).toContain('--cover-overlay:0.56')
    expect(html).toContain('--cover-focal-y:68%')
    expect(html).toContain('aria-label="Profile links"')
    expect(html).toContain('href="/customize"')
    expect(html).toContain('Design yours →')
    expect(html).not.toContain('Open profile menu')
    expect(html).not.toContain('cover-profile-eyebrow')
    expect(html).toContain('>Professional</span>')
  })

  it('keeps a draft wallpaper on the private preview route without preloading it publicly', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={cover} preview />)

    expect(html).toContain('/api/profile-cover?path=owner-1%2Fada-cover.webp')
    expect(html).not.toContain('published=1')
    expect(html).not.toContain('rel="preload" as="image"')
  })

  it('uses the Cover fallback when no cover image is saved', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={{ ...cover, cover: { ...cover.cover, coverPath: null } }} />)

    expect(html).toContain('cover-profile-wallpaper is-fallback')
    expect(html).not.toContain('/api/profile-cover?path=')
  })

  it('keeps the existing Minimal renderer selected', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={{ ...cover, template: 'minimal' }} />)

    expect(html).toContain('public-profile-shell')
    expect(html).not.toContain('cover-profile-shell')
  })

  it('uses the image optimizer for public profile photos', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={{ ...profile, photo_url: '/api/profile-photo?path=owner-1%2Fada.jpg' }} presentation={{ ...cover, template: 'minimal' }} />)

    expect(html).toContain('/_next/image?url=')
    expect(html).toContain('owner-1%252Fada.jpg')
  })
})
