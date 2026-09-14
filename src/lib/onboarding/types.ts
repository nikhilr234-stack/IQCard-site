export type OnboardingStep = 'identity' | 'contact' | 'content' | 'address' | 'preview' | 'publish'

export type OnboardingProgress = {
  ownerId: string
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  startedAt: string
  updatedAt: string
  completedAt: string | null
}
