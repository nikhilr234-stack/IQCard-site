/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiveOwnerCenter } from './live-owner-center'

describe('live owner center', () => {
  it('offers an explicit sign-out form in the dashboard header', () => {
    const html = renderToStaticMarkup(createElement(LiveOwnerCenter, {
      profile: {
        id: 'profile-1', owner_id: 'owner-1', slug: 'ada', status: 'published', full_name: 'Ada Lovelace',
        headline: '', tagline: '', bio: '', phone: '', email: 'ada@example.com', whatsapp: '', location: '',
        public_email_visible: false, phone_visible: false, whatsapp_visible: false, location_visible: false,
        photo_path: null, published_at: null, profile_links: [],
      },
      presentation: { template: 'minimal', cover: { coverPath: null, photoPathOverride: null, overlay: 0, focalY: 50, alignment: 'center' } },
      savedDesign: null, siteUrl: 'https://preview.example.com', onEditDetails: () => {},
    }))
    const host = document.createElement('div')
    host.innerHTML = html
    const form = host.querySelector<HTMLFormElement>('.owner-center-topbar form')
    expect(form?.getAttribute('action')).toBe('/auth/sign-out')
    expect(form?.method).toBe('post')
    expect(form?.querySelector('button')?.textContent).toBe('Sign out')
  })

  it('uses real owner data and explicit empty states instead of prototype data', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/dashboard/live-owner-center.tsx'), 'utf8')
    expect(source).toContain('Good morning')
    expect(source).toContain('profile.slug')
    expect(source).toContain('profile.profile_links')
    expect(source).toContain('SavedCardRenderer')
    expect(source).toContain('No analytics yet')
    expect(source).toContain('Spaces are coming soon')
    expect(source).not.toContain('Priya Sharma')
    expect(source).not.toContain('2,847')
  })

  it('uses the configured site URL for display, copy, and share', () => {
    const ownerCenter = readFileSync(resolve(process.cwd(), 'src/app/dashboard/live-owner-center.tsx'), 'utf8')
    const editor = readFileSync(resolve(process.cwd(), 'src/app/dashboard/profile-editor.tsx'), 'utf8')
    const page = readFileSync(resolve(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8')

    expect(ownerCenter).toContain('publicProfileUrl(siteUrl, profile.slug)')
    expect(editor).toContain('siteUrl={siteUrl}')
    expect(page).toContain('siteUrl={getPublicEnv().siteUrl}')
    expect(`${ownerCenter}\n${editor}`).not.toContain('https://iqcard.in')
  })

  it('routes both content management shortcuts directly to the Links editor', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/dashboard/live-owner-center.tsx'), 'utf8')
    expect(source).toContain('<Link href="/dashboard/digital-profile#links">Manage ↗</Link>')
    expect(source).toContain('<Link href="/dashboard/digital-profile#links">Add content <span>›</span></Link>')
  })

  it('uses the saved Digital Profile cover and photo in the dashboard identity preview', () => {
    const ownerCenter = readFileSync(resolve(process.cwd(), 'src/app/dashboard/live-owner-center.tsx'), 'utf8')

    expect(ownerCenter).toContain('presentation.cover.coverPath')
    expect(ownerCenter).toContain('/api/profile-cover?path=')
    expect(ownerCenter).toContain('profile.photo_url')
    expect(ownerCenter).toContain('owner-profile-photo')
  })

  it('passes the exact saved card directly to the one owner dashboard', () => {
    const editor = readFileSync(resolve(process.cwd(), 'src/app/dashboard/profile-editor.tsx'), 'utf8')

    expect(editor).toContain('savedDesign={savedDesign}')
    expect(editor).toContain('<LiveOwnerCenter')
  })

  it('lets the owner dashboard use the available desktop width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8')

    expect(css).toMatch(/\.owner-center\{[^}]*width:min\(1480px,100%\)/)
  })
})
