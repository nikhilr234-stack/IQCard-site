import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { PublicProfile } from './public-profile'
import { DEFAULT_PROFILE_DESIGN } from '@/lib/profile/design'
import { normalizePresentation } from '@/lib/profile/presentation'
import { getTemplateVariants, normalizeTemplateSettings } from '@/lib/profile/template-variants'
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
  it.each(['minimal', 'cover', 'studio', 'executive', 'signal', 'index'] as const)(
    'renders the shared Cover image as a page background on %s',
    (template) => {
      const base = presentation(template)
      const value = normalizePresentation({ draft: {
        ...base,
        cover: { ...base.cover, backgroundEnabled: true },
      } }).draft
      const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={value} />)

      expect(html).toContain('data-cover-background="true"')
      expect(html).toContain('data-profile-cover-background')
      expect(html).toContain('owner-1%252Freal-cover.webp')
    },
  )

  it.each((['minimal', 'cover', 'studio', 'executive', 'signal', 'index'] as const).flatMap((template) =>
    getTemplateVariants(template).map((variant) => [template, variant.id] as const),
  ))('renders %s layout variant %s without changing the template identity', (template, variant) => {
    const html = renderToStaticMarkup(<PublicProfile
      profile={profile}
      presentation={{ ...presentation(template), templateSettings: normalizeTemplateSettings({ [template]: { variant } }) }}
    />)

    expect(html).toContain(`data-template="${template}"`)
    expect(html).toContain(`data-layout-variant="${variant}"`)
    if (['studio', 'executive', 'signal', 'index'].includes(template) &&
      ['portfolio-grid', 'authority', 'poster', 'directory'].includes(variant)) {
      expect(html).toContain('data-composition="desktop"')
      expect(html).toContain('data-composition="mobile"')
    }
  })

  it('keeps the existing composition hooks for each canonical default', () => {
    const defaults = [
      ['minimal', 'classic', 'public-profile-hero'],
      ['cover', 'editorial-left', 'cover-profile-lower-third'],
      ['studio', 'portfolio-grid', 'data-composition="desktop"'],
      ['executive', 'authority', 'data-composition="desktop"'],
      ['signal', 'poster', 'data-composition="desktop"'],
      ['index', 'directory', 'data-composition="desktop"'],
    ] as const
    for (const [template, variant, composition] of defaults) {
      const html = renderToStaticMarkup(<PublicProfile
        profile={profile}
        presentation={{ ...presentation(template), templateSettings: normalizeTemplateSettings({ [template]: { variant } }) }}
      />)
      expect(html).toContain(composition)
    }
  })

  it('uses the published-only cover URL in the Studio feature image', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={presentation('studio')} />)

    expect(html).toContain('url=%2Fapi%2Fprofile-cover%3Fpath%3Downer-1%252Freal-cover.webp%26published%3D1')
  })

  it.each(['minimal', 'cover', 'studio', 'executive', 'signal', 'index'] as const)(
    'renders saved What’s next items on the %s public profile',
    (template) => {
      const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={{
        ...presentation(template),
        whatsNext: [{ title: 'Studio opening', description: 'A new space for collaborators.', date: 'October 24', url: 'https://example.com/opening' }],
      }} />)

      expect(html).toContain('What’s next')
      expect(html).toContain('Studio opening')
      expect(html).toContain('A new space for collaborators.')
      expect(html).toContain('October 24')
      expect(html).toContain('href="https://example.com/opening"')
    },
  )

  it('hides the What’s next section when no items have been added', () => {
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={presentation('cover')} />)

    expect(html).not.toContain('data-whats-next')
  })

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

  it('applies shared CSS design variables and brand icons to public templates', () => {
    const design = {
      ...DEFAULT_PROFILE_DESIGN,
      background: { color: '#123456', text: '#FFFFFF', accent: '#ABCDEF' },
      links: { ...DEFAULT_PROFILE_DESIGN.links, showIcons: true, iconStyle: 'brand' as const },
    }
    const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={{ ...presentation('executive'), design }} />)

    expect(html).toContain('--profile-bg:#123456')
    expect(html).toContain('data-link-icon="linkedin"')
    expect(html).toContain('<svg')
  })

  it.each(['minimal', 'cover', 'studio', 'executive', 'signal', 'index'] as const)(
    'normalizes legacy %s profiles and keeps their default visual layer inactive',
    (template) => {
      const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={presentation(template)} />)
      expect(html).toContain(`data-template="${template}"`)
      expect(html).not.toContain('--profile-bg:')
      expect(html).not.toContain('data-link-icon=')
    },
  )
})
