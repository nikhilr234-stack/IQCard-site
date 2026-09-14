import type { OnboardingStep } from '@/lib/onboarding/types'

export const onboardingStepLabels: Record<OnboardingStep, string> = {
  identity: 'Identity',
  contact: 'Contact',
  content: 'Content',
  address: 'Address',
  preview: 'Preview',
  publish: 'Publish',
}
