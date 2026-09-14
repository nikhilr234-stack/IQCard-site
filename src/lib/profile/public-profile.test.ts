import { describe, expect, it } from 'vitest'
import { buildPublicProfileView } from './public-profile'

const profile = {
  id: 'profile-1',
  owner_id: 'owner-1',
  slug: 'ada-lovelace',
  status: 'published' as const,
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
  published_at: null,
  profile_links: [
    { id: 'linkedin', profile_id: 'profile-1', label: 'LinkedIn', url: 'https://linkedin.com/in/ada', sort_order: 1 },
    { id: 'bad', profile_id: 'profile-1', label: 'Unsafe', url: 'javascript:alert(1)', sort_order: 2 },
  ],
}

describe('public profile view model', () => {
  it('keeps dynamic profile actions and filters unsafe links', () => {
    expect(buildPublicProfileView(profile)).toMatchObject({
      initials: 'AL',
      saveContactHref: '/api/contact/ada-lovelace',
      callHref: 'tel:+44 20 1234 5678',
      emailHref: 'mailto:ada@example.com',
      whatsappHref: 'https://wa.me/447700900123',
      links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/ada' }],
    })
  })

  it('filters legacy links outside the shared DNS/IPv4 URL contract', () => {
    const view = buildPublicProfileView({
      ...profile,
      profile_links: [
        { id: 'valid-domain', profile_id: 'profile-1', label: 'Domain', url: 'https://example.com:443/path?x=1', sort_order: 1 },
        { id: 'valid-ip', profile_id: 'profile-1', label: 'IPv4', url: 'https://192.0.2.10:65535', sort_order: 2 },
        { id: 'ipv6', profile_id: 'profile-1', label: 'IPv6', url: 'https://[::1]', sort_order: 3 },
        { id: 'empty-label', profile_id: 'profile-1', label: 'Empty', url: 'https://example..com', sort_order: 4 },
        { id: 'trailing-hyphen', profile_id: 'profile-1', label: 'Trailing', url: 'https://example-.com', sort_order: 5 },
        { id: 'leading-hyphen', profile_id: 'profile-1', label: 'Leading', url: 'https://example.-com', sort_order: 6 },
        { id: 'invalid-ip', profile_id: 'profile-1', label: 'Invalid IPv4', url: 'https://192.0.2.999', sort_order: 7 },
        { id: 'leading-zero-ip', profile_id: 'profile-1', label: 'Leading zero', url: 'https://192.168.001.001', sort_order: 8 },
        { id: 'valid-mailto', profile_id: 'profile-1', label: 'Mail', url: 'mailto:user%40example.com?subject=Hello%20there', sort_order: 9 },
        { id: 'invalid-mailto', profile_id: 'profile-1', label: 'Bad mail', url: 'mailto:user@example.com%ZZ', sort_order: 10 },
      ],
    })

    expect(view.links).toEqual([
      { label: 'Domain', url: 'https://example.com/path?x=1' },
      { label: 'IPv4', url: 'https://192.0.2.10:65535/' },
      { label: 'Mail', url: 'mailto:user%40example.com?subject=Hello%20there' },
    ])
  })

  it('falls back to IQ initials when a name is empty', () => {
    expect(buildPublicProfileView({ ...profile, full_name: '', phone: '', email: '', whatsapp: '' })).toMatchObject({
      initials: 'IQ',
      callHref: null,
      emailHref: null,
      whatsappHref: null,
    })
  })

  it('keeps contact methods private unless their new visibility switch is enabled', () => {
    expect(buildPublicProfileView({
      ...profile,
      public_email_visible: false,
      phone_visible: false,
      whatsapp: '+44 7700 900123',
      whatsapp_visible: false,
      location_visible: false,
    })).toMatchObject({ callHref: null, emailHref: null, whatsappHref: null, location: null })

    expect(buildPublicProfileView({
      ...profile,
      public_email_visible: true,
      phone_visible: true,
      whatsapp: '+44 7700 900123',
      whatsapp_visible: true,
      location: 'London',
      location_visible: true,
    })).toMatchObject({
      callHref: 'tel:+44 20 1234 5678',
      emailHref: 'mailto:ada@example.com',
      whatsappHref: 'https://wa.me/447700900123',
      location: 'London',
    })
  })
})
