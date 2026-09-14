/** @vitest-environment jsdom */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CoverPresentation, Profile } from '@/lib/profile/types'
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
  profile_links: [],
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
  publishAction: vi.fn(async () => undefined),
  uploadCoverAction: vi.fn(async (_formData: FormData) => ({ coverPath: 'owner-1/new-cover.webp' as string | null })),
  deleteCoverAction: vi.fn(async () => ({ coverPath: null as string | null })),
  uploadPhotoAction: vi.fn(async (_formData: FormData) => undefined),
  deletePhotoAction: vi.fn(async (_formData: FormData) => undefined),
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

  it('keeps the submitted draft and shared phone preview in sync', async () => {
    const focal = labelledInput(host, /Vertical image position/i)
    const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    valueSetter?.call(focal, '22')
    await act(async () => focal.dispatchEvent(new Event('input', { bubbles: true })))
    await act(async () => button(host, /Centered/i).click())

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
    })
    expect(host.querySelector('[aria-label="Profile phone preview"] .cover-profile--center')).not.toBeNull()
    expect(host.querySelector('[aria-label="Profile phone preview"] .cover-profile-shell')?.getAttribute('style')).toContain('--cover-focal-y: 22%')
  })
})
