/** @vitest-environment jsdom */

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { Profile } from '@/lib/profile/types'
import type { OnboardingStep } from '@/lib/onboarding/types'
import { OnboardingWizard } from './onboarding-wizard'
import { onboardingStepLabels } from './onboarding-styles'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/app/actions/onboarding', () => ({
  completeOnboarding: vi.fn(), saveAddressStep: vi.fn(), saveContactStep: vi.fn(),
  saveContentStep: vi.fn(), saveIdentityStep: vi.fn(), savePreviewStep: vi.fn(),
}))

const profile: Profile = {
  id: 'profile-1', owner_id: 'owner-1', slug: 'ada', status: 'draft', full_name: 'Ada Lovelace',
  headline: '', tagline: '', bio: '', phone: '', email: 'ada@example.com', whatsapp: '', location: '',
  public_email_visible: false, phone_visible: false, whatsapp_visible: false, location_visible: false,
  photo_path: null, published_at: null, profile_links: [],
}

function renderStep(step: OnboardingStep) {
  return renderToStaticMarkup(createElement(OnboardingWizard, {
    step, profile, verifiedEmail: 'ada@example.com', designId: 'IQD-TEST', siteUrl: 'https://preview.example.com',
  }))
}

describe('onboarding review and address display', () => {
  it('presents the final step as review and keeps the preview private until approval', () => {
    expect(onboardingStepLabels.publish).toBe('Review')
    expect(renderStep('preview')).toContain('This draft remains private until IQ Card approves it.')
    expect(renderStep('publish')).toContain('Submit for review')
  })

  it.each(['address', 'preview', 'publish'] as const)('uses the preview origin in the %s step', (step) => {
    const html = renderStep(step)
    expect(html).toContain('preview.example.com/')
    expect(html).not.toContain('iqcard.in/')
  })
})
