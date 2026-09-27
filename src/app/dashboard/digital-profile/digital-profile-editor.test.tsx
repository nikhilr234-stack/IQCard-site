/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CoverPresentation, Profile } from '@/lib/profile/types'
import { DEFAULT_PROFILE_DESIGN } from '@/lib/profile/design'
import { DigitalProfileEditor } from './digital-profile-editor'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const profile: Profile = {
  id: 'profile-1',
  owner_id: 'owner-1',
  slug: 'ada',
  status: 'published',
  full_name: 'Ada Lovelace',
  headline: 'Mathematician',
  tagline: 'Poetical science',
  bio: 'Building analytical engines.',
  phone: '+44123456789',
  email: 'ada@example.com',
  whatsapp: '',
  location: 'London',
  public_email_visible: true,
  phone_visible: true,
  whatsapp_visible: false,
  location_visible: true,
  photo_path: 'owner-1/ada.webp',
  photo_url: '/api/profile-photo?path=owner-1%2Fada.webp',
  published_at: '2026-09-14T00:00:00.000Z',
  profile_links: [
    { id: 'link-1', profile_id: 'profile-1', label: 'LinkedIn', url: 'https://linkedin.com/in/ada', sort_order: 0 },
    { id: 'link-2', profile_id: 'profile-1', label: 'Website', url: 'https://ada.example.com', sort_order: 1 },
  ],
}

const coverPresentation: CoverPresentation = {
  template: 'cover',
  cover: {
    coverPath: 'owner-1/cover.webp',
    overlay: 0.38,
    focalY: 64,
    alignment: 'lower-left',
    photoPathOverride: null,
  },
}

const actions = {
  saveDraftAction: vi.fn(async (_formData: FormData) => undefined),
  publishAction: vi.fn(async (): Promise<{ success: true } | { success: false; error: string }> => ({ success: true })),
  uploadCoverAction: vi.fn(async (_formData: FormData) => ({ coverPath: 'owner-1/new-cover.webp' as string | null })),
  deleteCoverAction: vi.fn(async () => ({ coverPath: null as string | null })),
  uploadPhotoAction: vi.fn(async (_formData: FormData) => undefined),
  deletePhotoAction: vi.fn(async (_formData: FormData) => undefined),
  saveLinksAction: vi.fn(async (_formData: FormData) => undefined),
}

function button(host: HTMLElement, name: RegExp) {
  const match = [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) => name.test(candidate.getAttribute('aria-label') ?? candidate.textContent ?? ''))
  if (!match) throw new Error(`Missing button: ${name}`)
  return match
}

function labelledInput(host: HTMLElement, name: RegExp) {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find((candidate) => name.test(candidate.textContent ?? ''))
  const control = label?.htmlFor ? host.querySelector<HTMLInputElement>(`#${label.htmlFor}`) : null
  if (!control) throw new Error(`Missing input: ${name}`)
  return control
}

describe('DigitalProfileEditor', () => {
  let host: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root.render(
      <DigitalProfileEditor profile={profile} presentation={coverPresentation} {...actions} />,
    ))
  })

  afterEach(async () => {
    await act(async () => root.unmount())
    host.remove()
    vi.clearAllMocks()
  })

  it('restores Cover controls after switching through Minimal', async () => {
    await act(async () => button(host, /01 Minimal/i).click())
    expect(() => labelledInput(host, /Darken background/i)).toThrow()

    await act(async () => button(host, /02 Cover/i).click())

    expect(labelledInput(host, /Darken background/i).value).toBe('0.38')
    expect(button(host, /Lower left/i).getAttribute('aria-pressed')).toBe('true')
  })

  it('keeps one selected layout per template and updates only the live draft preview', async () => {
    const initial = JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '')

    await act(async () => button(host, /Centered Hero/i).click())
    expect(host.querySelector('.digital-profile-phone-screen [data-template="cover"]')?.getAttribute('data-layout-variant')).toBe('centered-hero')

    await act(async () => button(host, /01 Minimal/i).click())
    await act(async () => button(host, /Swiss Grid/i).click())
    await act(async () => button(host, /03 Studio/i).click())
    await act(async () => button(host, /Hero Project/i).click())
    await act(async () => button(host, /04 Executive/i).click())
    await act(async () => button(host, /Compact Board/i).click())
    await act(async () => button(host, /05 Signal/i).click())
    await act(async () => button(host, /Type First/i).click())
    await act(async () => button(host, /06 Index/i).click())
    await act(async () => button(host, /Grid Index/i).click())
    await act(async () => button(host, /02 Cover/i).click())

    const serialized = JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '')
    expect(serialized.templateSettings).toEqual({
      cover: { variant: 'centered-hero' },
      minimal: { variant: 'swiss-grid' },
      studio: { variant: 'hero-project' },
      executive: { variant: 'compact-board' },
      signal: { variant: 'type-first' },
      index: { variant: 'grid-index' },
    })
    expect(serialized.design).toEqual(initial.design)
    expect(host.querySelector('.digital-profile-phone-screen [data-template="cover"]')?.getAttribute('data-layout-variant')).toBe('centered-hero')
  })

  it('keeps the shared profile photo controls available in Minimal', async () => {
    await act(async () => button(host, /01 Minimal/i).click())

    expect(labelledInput(host, /Change photo/i).name).toBe('photo')
    expect(button(host, /Remove photo/i)).not.toBeNull()
    expect(() => labelledInput(host, /Change Cover/i)).toThrow()
  })

  it('keeps the submitted draft and shared phone preview in sync', async () => {
    const focal = labelledInput(host, /Vertical image position/i)
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    valueSetter?.call(focal, '22')
    await act(async () => focal.dispatchEvent(new Event('input', { bubbles: true })))
    const centeredAlignment = host.querySelector<HTMLButtonElement>('.digital-profile-alignment button:nth-of-type(2)')
    expect(centeredAlignment).not.toBeNull()
    await act(async () => centeredAlignment?.click())

    const serialized = host.querySelector<HTMLInputElement>('input[name="presentation"]')
    expect(JSON.parse(serialized?.value ?? '')).toEqual({
      template: 'cover',
      cover: {
        coverPath: 'owner-1/cover.webp',
        overlay: 0.38,
        focalY: 22,
        alignment: 'center',
        photoPathOverride: null,
      },
      design: DEFAULT_PROFILE_DESIGN,
      templateSettings: {
        cover: { variant: 'editorial-left' },
        minimal: { variant: 'classic' },
        studio: { variant: 'portfolio-grid' },
        executive: { variant: 'authority' },
        signal: { variant: 'poster' },
        index: { variant: 'directory' },
      },
    })
    expect(host.querySelector('[aria-label="Profile phone preview"] .cover-profile--center')).not.toBeNull()
    expect(host.querySelector('[aria-label="Profile phone preview"] .cover-profile-shell')?.getAttribute('style')).toContain('--cover-focal-y: 22%')
  })

  it('applies a preset to shared design only and keeps it as an unpublished draft', async () => {
    await act(async () => button(host, /^Editorial$/i).click())

    const serialized = JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '')
    expect(serialized.template).toBe('cover')
    expect(serialized.design.typography.family).toBe('serif')
    expect(serialized.design.version).toBe(1)
    expect(host.textContent).toContain('Ada Lovelace')
    expect(actions.publishAction).not.toHaveBeenCalled()
  })

  it('updates preview immediately when background color changes', async () => {
    const color = host.querySelector<HTMLInputElement>('input[aria-label="Background color"]')
    expect(color).not.toBeNull()
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    valueSetter?.call(color, '#2468AC')
    await act(async () => color?.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () => color?.dispatchEvent(new Event('change', { bubbles: true })))

    expect(host.querySelector('.cover-profile-shell')?.getAttribute('style')).toContain('--profile-bg: #2468AC')
    expect(JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '').design.background.color).toBe('#2468AC')
  })

  it('provides collapsible design sections and keeps unsupported links disabled for Minimal', async () => {
    expect(host.querySelectorAll('.digital-profile-design details').length).toBeGreaterThanOrEqual(6)
    await act(async () => button(host, /01 Minimal/i).click())

    expect(button(host, /^Links Cards$/i).disabled).toBe(true)
    expect(JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '').design.links.style).toBe(DEFAULT_PROFILE_DESIGN.links.style)
  })

  it('updates photo, link, button and footer treatments in the live preview', async () => {
    await act(async () => button(host, /Photo shape Square/i).click())
    await act(async () => button(host, /Links Cards/i).click())
    const showLogos = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find((input) => input.closest('label')?.textContent?.includes('Show logos'))
    const showMadeWithIq = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].find((input) => input.closest('label')?.textContent?.includes('Made with iq'))
    expect(showLogos).not.toBeNull()
    expect(showMadeWithIq).not.toBeNull()
    await act(async () => showLogos?.click())
    await act(async () => showMadeWithIq?.click())
    await act(async () => button(host, /Button style Outline/i).click())

    const preview = host.querySelector('.digital-profile-phone-screen')
    expect(preview?.querySelector('.cover-profile-shell')?.getAttribute('data-photo-shape')).toBe('square')
    expect(preview?.querySelector('.cover-profile-links')?.getAttribute('data-link-style')).toBe('cards')
    expect(preview?.querySelector('[data-link-icon="linkedin"]')).not.toBeNull()
    expect(preview?.querySelector('.cover-profile-shell')?.getAttribute('data-button-style')).toBe('outline')
    expect(preview?.querySelector('.cover-profile-footer strong')).toBeNull()
  })

  it('resets one design section and the full design independently', async () => {
    await act(async () => button(host, /^Editorial$/i).click())
    await act(async () => button(host, /Reset Typography/i).click())
    let design = JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '').design
    expect(design.typography).toEqual(DEFAULT_PROFILE_DESIGN.typography)
    expect(design.background.color).toBe('#F5F2EA')

    await act(async () => button(host, /Reset design/i).click())
    design = JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '').design
    expect(design).toEqual(DEFAULT_PROFILE_DESIGN)
  })

  it('keeps unsupported card layout in saved shared settings while rendering a safe Minimal fallback', async () => {
    await act(async () => button(host, /Links Cards/i).click())
    await act(async () => button(host, /01 Minimal/i).click())

    const serialized = JSON.parse(host.querySelector<HTMLInputElement>('input[name="presentation"]')?.value ?? '')
    expect(serialized.design.links.style).toBe('cards')
    expect(button(host, /Links Cards/i).disabled).toBe(true)
    expect(host.querySelector('.digital-profile-phone-screen .public-profile-links')?.getAttribute('data-link-style')).toBe('rows')
  })

  it('saves the same customized draft before publishing it', async () => {
    await act(async () => button(host, /Photo shape Circle/i).click())
    await act(async () => button(host, /Publish/i).click())

    const saved = actions.saveDraftAction.mock.calls.at(-1)?.[0]
    expect(JSON.parse(String(saved?.get('presentation'))).design.profile.photoShape).toBe('circle')
    expect(actions.saveDraftAction.mock.invocationCallOrder.at(-1)).toBeLessThan(actions.publishAction.mock.invocationCallOrder.at(-1) ?? Infinity)
  })

  it('shows a server-action publish failure inline without replacing the editor', async () => {
    actions.publishAction.mockResolvedValueOnce({ success: false, error: 'Unable to publish profile.' })

    await act(async () => button(host, /Publish/i).click())

    const feedback = host.querySelector('.digital-profile-action-feedback')
    expect(feedback?.getAttribute('role')).toBe('alert')
    expect(feedback?.textContent).toBe('Unable to publish profile.')
    expect(host.querySelector('.digital-profile-controls')).not.toBeNull()
  })

  it('shows success feedback after a clean publish action result', async () => {
    await act(async () => button(host, /Publish/i).click())

    const feedback = host.querySelector('.digital-profile-action-feedback')
    expect(feedback?.getAttribute('role')).toBe('status')
    expect(feedback?.textContent).toBe('Digital profile published.')
  })

  it('loads existing links in their saved order and quick-adds an empty labeled row', async () => {
    expect([...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="label"]')].map((input) => input.value)).toEqual(['LinkedIn', 'Website'])
    expect([...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="url"]')].map((input) => input.value)).toEqual(['https://linkedin.com/in/ada', 'https://ada.example.com'])

    await act(async () => button(host, /^Instagram$/i).click())

    expect([...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="label"]')].map((input) => input.value)).toEqual(['LinkedIn', 'Website', 'Instagram'])
    expect([...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="url"]')].map((input) => input.value)).toEqual(['https://linkedin.com/in/ada', 'https://ada.example.com', ''])
  })

  it('supports custom links, deletion, and reorder controls', async () => {
    await act(async () => button(host, /\+ Custom link/i).click())
    const labels = [...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="label"]')]
    expect(labels.at(-1)?.value).toBe('')
    const urls = [...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="url"]')]
    expect(urls.at(-1)?.value).toBe('')

    await act(async () => button(host, /Move Website up/i).click())
    expect([...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="label"]')].slice(0, 2).map((input) => input.value)).toEqual(['Website', 'LinkedIn'])
    await act(async () => button(host, /Save Links/i).click())
    expect(JSON.parse(String(vi.mocked(actions.saveLinksAction).mock.calls[0]?.[0].get('links'))).map((link: { label: string }) => link.label)).toEqual(['Website', 'LinkedIn', ''])

    await act(async () => button(host, /Remove Website/i).click())
    expect([...host.querySelectorAll<HTMLInputElement>('[data-link-row] input[name="label"]')].map((input) => input.value)).toEqual(['LinkedIn', ''])
  })

  it('accepts and saves a custom label and URL', async () => {
    await act(async () => button(host, /\+ Custom link/i).click())
    const row = host.querySelectorAll<HTMLElement>('[data-link-row]')[2]
    const label = row?.querySelector<HTMLInputElement>('input[name="label"]')
    const url = row?.querySelector<HTMLInputElement>('input[name="url"]')
    if (!label || !url) throw new Error('Missing custom link fields')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(label, 'My Portfolio')
    await act(async () => label.dispatchEvent(new Event('input', { bubbles: true })))
    setter?.call(url, 'https://portfolio.example.com')
    await act(async () => url.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () => button(host, /Save Links/i).click())

    expect(JSON.parse(String(vi.mocked(actions.saveLinksAction).mock.calls[0]?.[0].get('links')))).toContainEqual({ label: 'My Portfolio', url: 'https://portfolio.example.com' })
  })

  it('enforces the twelve-link limit and validates a bad URL beside its row', async () => {
    for (let index = 0; index < 10; index += 1) {
      await act(async () => button(host, /^YouTube$/i).click())
    }
    expect(button(host, /add another link/i).disabled).toBe(true)
    expect(button(host, /GitHub/i).disabled).toBe(true)
  })

  it('saves all links through the supplied secure action and shows inline success', async () => {
    const urlInput = host.querySelector<HTMLInputElement>('[data-link-row] input[name="url"]')
    if (!urlInput) throw new Error('Missing URL input')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(urlInput, 'not a url')
    await act(async () => urlInput.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () => button(host, /Save Links/i).click())
    expect(host.querySelector('[data-link-row] [role="alert"]')?.textContent).toMatch(/HTTP\(S\)|contact link/i)
    expect(actions.saveLinksAction).not.toHaveBeenCalled()

    setter?.call(urlInput, 'https://linkedin.com/in/ada')
    await act(async () => urlInput.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () => button(host, /Save Links/i).click())

    const formData = vi.mocked(actions.saveLinksAction).mock.calls[0]?.[0]
    expect(JSON.parse(String(formData?.get('links')))).toEqual([
      { label: 'LinkedIn', url: 'https://linkedin.com/in/ada' },
      { label: 'Website', url: 'https://ada.example.com' },
    ])
    expect(host.textContent).toContain('Links updated.')
  })

  it.each([
    ['03 Studio', 'studio'],
    ['04 Executive', 'executive'],
    ['05 Signal', 'signal'],
    ['06 Index', 'index'],
  ] as const)('selects and serializes %s from the existing template picker', async (buttonName, template) => {
    await act(async () => button(host, new RegExp(buttonName, 'i')).click())

    const serialized = host.querySelector<HTMLInputElement>('input[name="presentation"]')
    expect(JSON.parse(serialized?.value ?? '').template).toBe(template)
    expect(host.querySelector(`[data-template="${template}"]`)).not.toBeNull()
  })
})
