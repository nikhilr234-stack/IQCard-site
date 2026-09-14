import type { OnboardingStep } from './types'

export const onboardingSteps = ['identity', 'contact', 'content', 'address', 'preview', 'publish'] as const satisfies readonly OnboardingStep[]

export function firstIncompleteStep(completedSteps: readonly OnboardingStep[]): OnboardingStep | null {
  const completed = new Set(completedSteps)
  return onboardingSteps.find((step) => !completed.has(step)) ?? null
}

export function onboardingPath(step: OnboardingStep): `/onboarding/${OnboardingStep}` {
  return `/onboarding/${step}`
}
