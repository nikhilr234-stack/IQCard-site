import type { LinkInput } from '@/lib/profile/links'
import { onboardingPath, onboardingSteps } from './steps'
import type { OnboardingStep } from './types'
import {
  validateAddressStep,
  validateContactStep,
  validateContentStep,
  validateIdentityStep,
  validatePublicationReadiness,
} from './validation'

export type OnboardingActionState = {
  ok: boolean
  fieldErrors: Record<string, string>
  formError?: string
  next?: string
  alternatives?: string[]
}

export interface OnboardingActionServices {
  getAccount(): Promise<{ id: string; email: string }>
  updateProfile(ownerId: string, values: Record<string, unknown>): Promise<void>
  replaceLinks(ownerId: string, links: LinkInput[]): Promise<void>
  isSlugAvailable(ownerId: string, slug: string): Promise<boolean>
  getProfile(ownerId: string): Promise<{ full_name: string; slug: string }>
  completePublish(ownerId: string, publish: boolean): Promise<void>
  completeStep(ownerId: string, step: OnboardingStep): Promise<unknown>
  revalidate(path: string): void
  recordEvent?(event: 'onboarding_step_saved' | 'onboarding_completed', step: OnboardingStep): void
}

function field(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function nextAfter(step: OnboardingStep): string {
  const index = onboardingSteps.indexOf(step)
  const next = onboardingSteps[index + 1]
  return next ? onboardingPath(next) : '/dashboard'
}

function invalid(fieldErrors: Record<string, string>, alternatives?: string[]): OnboardingActionState {
  return { ok: false, fieldErrors, ...(alternatives ? { alternatives } : {}) }
}

export async function runOnboardingStep(
  step: OnboardingStep,
  formData: FormData,
  services: OnboardingActionServices,
): Promise<OnboardingActionState> {
  const account = await services.getAccount()

  try {
    if (step === 'identity') {
      const validation = validateIdentityStep({
        firstName: field(formData, 'firstName'),
        lastName: field(formData, 'lastName'),
        headline: field(formData, 'headline'),
        bio: field(formData, 'bio'),
      })
      if (!validation.ok) return invalid(validation.fieldErrors)
      await services.updateProfile(account.id, {
        full_name: validation.value.fullName,
        headline: validation.value.headline,
        bio: validation.value.bio,
      })
    } else if (step === 'contact') {
      const validation = validateContactStep({
        publicEmail: field(formData, 'publicEmail'),
        phone: field(formData, 'phone'),
        whatsapp: field(formData, 'whatsapp'),
        location: field(formData, 'location'),
      })
      if (!validation.ok) return invalid(validation.fieldErrors)
      await services.updateProfile(account.id, {
        email: validation.value.publicEmail,
        phone: validation.value.phone,
        whatsapp: validation.value.whatsapp,
        location: validation.value.location,
        public_email_visible: field(formData, 'publicEmailVisible') === 'on',
        phone_visible: field(formData, 'phoneVisible') === 'on',
        whatsapp_visible: field(formData, 'whatsappVisible') === 'on',
        location_visible: field(formData, 'locationVisible') === 'on',
      })
    } else if (step === 'content') {
      let links: LinkInput[]
      try {
        const parsed: unknown = JSON.parse(field(formData, 'links') || '[]')
        links = Array.isArray(parsed)
          ? parsed.map((link) => ({
            label: typeof link?.label === 'string' ? link.label : '',
            url: typeof link?.url === 'string' ? link.url : '',
          }))
          : []
      } catch {
        return invalid({ links: 'We could not read your links. Please try again.' })
      }
      const validation = validateContentStep(links)
      if (!validation.ok) return invalid(validation.fieldErrors)
      await services.replaceLinks(account.id, validation.value)
    } else if (step === 'address') {
      const validation = validateAddressStep({ slug: field(formData, 'slug') })
      if (!validation.ok) return invalid(validation.fieldErrors)
      if (!await services.isSlugAvailable(account.id, validation.value.slug)) {
        return invalid(
          { slug: 'That profile URL is already taken.' },
          [`${validation.value.slug}-2`, `${validation.value.slug}-3`],
        )
      }
      await services.updateProfile(account.id, { slug: validation.value.slug })
    } else if (step === 'publish') {
      const profile = await services.getProfile(account.id)
      const validation = validatePublicationReadiness({
        verifiedEmail: account.email,
        fullName: profile.full_name,
        slug: profile.slug,
      })
      if (!validation.ok) return invalid(validation.fieldErrors)
      await services.completePublish(account.id, field(formData, 'mode') !== 'private')
    }

    if (step !== 'publish') await services.completeStep(account.id, step)
    services.recordEvent?.(step === 'publish' ? 'onboarding_completed' : 'onboarding_step_saved', step)
    services.revalidate('/dashboard')
    return { ok: true, fieldErrors: {}, next: nextAfter(step) }
  } catch {
    return { ok: false, fieldErrors: {}, formError: 'We could not save this step. Please try again.' }
  }
}
