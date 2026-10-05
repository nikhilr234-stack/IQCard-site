import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const wizard = readFileSync(resolve(process.cwd(), 'src/app/onboarding/onboarding-wizard.tsx'), 'utf8')
const page = readFileSync(resolve(process.cwd(), 'src/app/onboarding/[step]/page.tsx'), 'utf8')
const layout = readFileSync(resolve(process.cwd(), 'src/app/onboarding/layout.tsx'), 'utf8')

describe('onboarding wizard route contract', () => {
  it('renders all six steps with server-derived progress navigation', () => {
    expect(layout).toContain('getOnboardingProgress')
    expect(layout).toContain('onboardingSteps.map')
    expect(page).toContain('getOnboardingProgress')
    expect(page).toContain('redirect(onboardingPath(progress.currentStep))')
  })

  it('shows required identity labels and inline error regions', () => {
    expect(wizard).toContain('First name')
    expect(wizard).toContain('Last name')
    expect(wizard).toContain('Required')
    expect(wizard).toContain('aria-live="polite"')
    expect(wizard).toContain('state.fieldErrors')
  })

  it('submits the completed profile for administrator review instead of publishing it directly', () => {
    expect(wizard).toContain('Back')
    expect(wizard).toContain('Continue')
    expect(wizard).toContain('Submit for review')
    expect(wizard).toContain('Only IQ Card can publish')
    expect(wizard).not.toContain('Publish profile')
  })

  it('uses action state, pending UI, and focuses the first invalid field', () => {
    expect(wizard).toContain('useActionState')
    expect(wizard).toContain('pending')
    expect(wizard).toContain("querySelector('[aria-invalid=\"true\"]')")
  })
})
