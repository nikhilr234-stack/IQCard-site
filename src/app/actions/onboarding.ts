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

// Only return availability, never the identity or details of the current owner.
export async function checkAddressOptions(input: string) {
  const service = services()
  const account = await service.getAccount()
  const { full_name } = await service.getProfile(account.id)
  const { suggestSlug, validateSlug } = await import('@/lib/profile/validation')
  const [first = '', ...rest] = full_name.trim().split(/\s+/)
  const firstSlug = suggestSlug(first)
  const lastSlug = suggestSlug(rest.join(' '))
  const normalized = suggestSlug(typeof input === 'string' ? input.slice(0, 100) : '')
  const candidates = [...new Set([
    firstSlug,
    lastSlug ? `${firstSlug}-${lastSlug}` : '',
    lastSlug ? `${firstSlug}-${lastSlug[0]}` : '',
    `${firstSlug}-2`, `${firstSlug}-3`, `${firstSlug}-4`,
  ])].filter((candidate) => candidate && candidate.length <= 80 && !validateSlug(candidate))
  const check = async (candidate: string) => service.isSlugAvailable(account.id, candidate)
  const [current, checks] = await Promise.all([
    normalized && !validateSlug(normalized) ? check(normalized) : Promise.resolve(null),
    Promise.all(candidates.map(check)),
  ])
  return { normalized, available: current, suggestions: candidates.filter((_, index) => checks[index]).slice(0, 3) }
}
