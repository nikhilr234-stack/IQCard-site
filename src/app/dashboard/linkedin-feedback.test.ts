import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

const dependencies = vi.hoisted(() => ({
  requireAuthenticatedAccount: vi.fn(),
  getOwnProfile: vi.fn(),
  getLatestCheckoutHandoff: vi.fn(),
  getPublicEnv: vi.fn(),
}))

vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: dependencies.requireAuthenticatedAccount }))
vi.mock('@/lib/profile/repository', () => ({ getOwnProfile: dependencies.getOwnProfile }))
vi.mock('@/lib/checkout/repository', () => ({ getLatestCheckoutHandoff: dependencies.getLatestCheckoutHandoff }))
vi.mock('@/lib/features', () => ({ isOnboardingV2Enabled: () => false }))
vi.mock('@/lib/linkedin', async (loadOriginal) => {
  const original = await loadOriginal<typeof import('@/lib/linkedin')>()
  return { ...original, isLinkedInImportConfigured: () => true }
})
vi.mock('@/lib/env', () => ({ getPublicEnv: dependencies.getPublicEnv }))

import DashboardPage from './page'

const profile = {
  id: 'profile-1', owner_id: 'owner-1', slug: 'owner', status: 'draft' as const,
  full_name: 'Owner Name', headline: '', tagline: '', bio: '', phone: '', email: '', whatsapp: '', location: '',
  public_email_visible: false, phone_visible: false, whatsapp_visible: false, location_visible: false,
  photo_path: null, photo_url: null, published_at: null, profile_links: [],
}

async function renderDashboard(linkedin: string) {
  const page = DashboardPage as unknown as (props: {
    searchParams: Promise<{ linkedin?: string | string[] }>
  }) => Promise<ReactElement>
  return renderToStaticMarkup(await page({ searchParams: Promise.resolve({ linkedin }) }))
}

describe('dashboard LinkedIn import feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dependencies.requireAuthenticatedAccount.mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', role: 'client' })
    dependencies.getOwnProfile.mockResolvedValue(profile)
    dependencies.getLatestCheckoutHandoff.mockResolvedValue(null)
    dependencies.getPublicEnv.mockReturnValue({ siteUrl: 'https://iqcard.in' })
  })

  it.each([
    ['imported', 'LinkedIn details imported. Review your profile before publishing.', 'status'],
    ['cancelled', 'LinkedIn import was cancelled.', 'status'],
    ['unavailable', 'LinkedIn import is not configured right now.', 'alert'],
    ['invalid_state', 'Your LinkedIn import session expired. Please try again.', 'alert'],
    ['temporary_error', 'LinkedIn is temporarily unavailable. Please try again.', 'alert'],
    ['token_error', 'LinkedIn could not complete sign-in. Please try again.', 'alert'],
    ['profile_error', 'LinkedIn could not load your profile. Please try again.', 'alert'],
    ['save_error', 'LinkedIn details could not be saved. Please try again.', 'alert'],
    ['unpublish_first', 'Unpublish your profile before importing LinkedIn details.', 'alert'],
  ])('renders safe feedback for %s', async (code, message, role) => {
    const html = await renderDashboard(code)

    expect(html).toContain(message)
    expect(html).toContain(`role="${role}"`)
  })

  it('ignores unknown values instead of reflecting query-string content', async () => {
    const raw = '<img src=x onerror=alert(1)>'
    const html = await renderDashboard(raw)

    expect(html).not.toContain('onerror')
    expect(html).not.toContain('&lt;img')
  })
})
