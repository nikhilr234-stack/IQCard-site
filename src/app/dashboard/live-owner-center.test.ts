/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LiveOwnerCenter } from './live-owner-center'
import type { ProfileStatus } from '@/lib/profile/types'

function renderOwner(status: ProfileStatus) {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(createElement(LiveOwnerCenter, {
    profile: {
      id: 'profile-1', owner_id: 'owner-1', slug: 'ada', status, full_name: 'Ada Lovelace',
      headline: '', tagline: '', bio: '', phone: '', email: 'ada@example.com', whatsapp: '', location: '',
      public_email_visible: false, phone_visible: false, whatsapp_visible: false, location_visible: false,
      photo_path: null, published_at: null, profile_links: [],
    },
    presentation: { template: 'minimal', cover: { coverPath: null, photoPathOverride: null, overlay: 0, focalY: 50, alignment: 'center' } },
    savedDesign: null, siteUrl: 'https://preview.example.com', onEditDetails: () => {},
  }))
  return host
}

describe('live owner center', () => {
  it('keeps private profiles out of live status and public sharing controls', () => {
    const host = renderOwner('draft')
    expect(host.querySelector('.owner-live')?.textContent).toBe('PRIVATE')
    expect(host.textContent).not.toMatch(/\blive\b/i)
    expect(host.textContent).toContain('Your profile is private. You can still edit it.')
    expect(host.querySelector('.owner-profile-head')?.textContent).toContain('PRIVATE PREVIEW')
    expect(host.querySelector('a[href="/ada"]')).toBeNull()
    expect([...host.querySelectorAll('button')].map(button => button.textContent)).not.toContain('Share')
    expect(host.querySelector('.owner-share button')).toBeNull()
    expect(host.querySelector('.owner-share')?.textContent).toContain('Sharing is available after publication.')
    expect(host.querySelector('a[href="/dashboard/digital-profile"]')).not.toBeNull()
  })

  it('enables public profile access and sharing after publication', () => {
    const host = renderOwner('published')
    expect(host.querySelector('.owner-live')?.textContent).toBe('LIVE')
    expect(host.querySelector('a[href="/ada"]')?.textContent).toBe('View public profile ↗')
    expect([...host.querySelectorAll('button')].map(button => button.textContent)).toContain('Share')
    expect(host.querySelector('.owner-share button')).not.toBeNull()
    expect(host.querySelector('.owner-share')?.textContent).toContain('preview.example.com/ada')
  })

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
