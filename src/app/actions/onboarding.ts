'use server'

import { runOnboardingStep, type OnboardingActionState } from '@/lib/onboarding/action-runner'
import { createOnboardingActionServices } from '@/lib/onboarding/services'

const services = () => createOnboardingActionServices()

export async function saveIdentityStep(_previous: OnboardingActionState, formData: FormData) {
  return runOnboardingStep('identity', formData, services())
}

export async function saveContactStep(_previous: OnboardingActionState, formData: FormData) {
  return runOnboardingStep('contact', formData, services())
}

export async function saveContentStep(_previous: OnboardingActionState, formData: FormData) {
  return runOnboardingStep('content', formData, services())
}

export async function saveAddressStep(_previous: OnboardingActionState, formData: FormData) {
  return runOnboardingStep('address', formData, services())
}

export async function savePreviewStep(_previous: OnboardingActionState, formData: FormData) {
  return runOnboardingStep('preview', formData, services())
}

export async function completeOnboarding(_previous: OnboardingActionState, formData: FormData) {
  return runOnboardingStep('publish', formData, services())
}
