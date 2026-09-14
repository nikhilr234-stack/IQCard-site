import { describe, expect, it } from 'vitest'
import { isOnboardingV2Enabled } from './features'

describe('onboarding v2 feature flag', () => {
  it('is opt-in and accepts only an explicit true value', () => {
    expect(isOnboardingV2Enabled({})).toBe(false)
    expect(isOnboardingV2Enabled({ IQCARD_ONBOARDING_V2: 'false' })).toBe(false)
    expect(isOnboardingV2Enabled({ IQCARD_ONBOARDING_V2: 'true' })).toBe(true)
  })
})
