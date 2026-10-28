import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { LiveOwnerCenter } from './live-owner-center'
import type { Profile, CoverPresentation } from '@/lib/profile/types'

const profile: Profile = { id: 'p', owner_id: 'u', slug: 'ada', status: 'draft', full_name: 'Ada', headline: '', tagline: '', bio: '', email: '', phone: '', whatsapp: '', location: '', public_email_visible: false, phone_visible: false, whatsapp_visible: false, location_visible: false, photo_path: null, published_at: null, profile_links: [] }
const presentation: CoverPresentation = { template: 'cover', cover: { coverPath: null, overlay: 0, focalY: 50, alignment: 'center', photoPathOverride: null } }
describe('owner visibility', () => {
  it('does not advertise a draft as live or offer public sharing', () => {
    const html = renderToStaticMarkup(<LiveOwnerCenter profile={profile} presentation={presentation} savedDesign={null} siteUrl="https://iqcard.test" onEditDetails={vi.fn()} />)
    expect(html).toContain('Private draft')
    expect(html).not.toContain('Everything is live')
    expect(html).not.toContain('View public profile')
    expect(html).toContain('Review profile')
  })
  it('offers a real visibility action for a published profile', () => {
    const html = renderToStaticMarkup(<LiveOwnerCenter profile={{ ...profile, status: 'published' }} presentation={presentation} savedDesign={null} siteUrl="https://iqcard.test" onEditDetails={vi.fn()} unpublishAction={async () => {}} />)
    expect(html).toContain('Make profile private')
    expect(html).toContain('Share link')
    expect(html).not.toContain('SHARE &amp; QR')
  })
})
