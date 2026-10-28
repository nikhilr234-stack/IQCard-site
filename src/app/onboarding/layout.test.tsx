import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import OnboardingLayout from './layout'

vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn(async () => ({ id: 'owner-1' })) }))
vi.mock('@/lib/onboarding/progress', async importOriginal => ({
  ...await importOriginal<typeof import('@/lib/onboarding/progress')>(),
  getOnboardingProgress: vi.fn(async () => ({ completedSteps: [], currentStep: 'identity', completedAt: null })),
}))

describe('onboarding account controls', () => {
  it('offers sign out before setup is complete, alongside save and exit', async () => {
    const html = renderToStaticMarkup(await OnboardingLayout({ children: <p>Set up your profile</p> }))
    expect(html).toContain('action="/auth/sign-out"')
    expect(html).toContain('method="post"')
    expect(html).toContain('>Sign out</button>')
    expect(html).toContain('Save &amp; exit')
  })
})
