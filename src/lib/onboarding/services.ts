import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { completeOnboardingStep } from '@/lib/onboarding/progress'
import type { LinkInput } from '@/lib/profile/links'
import { createServerClient } from '@/lib/supabase/server'
import type { OnboardingActionServices } from './action-runner'
import { randomUUID } from 'node:crypto'
import { logRegistrationEvent } from '@/lib/registration/observability'

export function createOnboardingActionServices(): OnboardingActionServices {
  return {
    getAccount: requireAuthenticatedAccount,
    async updateProfile(ownerId, values) {
      const { error } = await (await createServerClient()).from('profiles').update(values).eq('owner_id', ownerId)
      if (error) throw new Error('Unable to update profile')
    },
    async replaceLinks(_ownerId, links: LinkInput[]) {
      const supabase = await createServerClient()
      const { error } = await supabase.rpc('replace_own_profile_links', { p_links: links })
      if (error) throw new Error('Unable to update links')
    },
    async isSlugAvailable(ownerId, slug) {
      const { data, error } = await (await createServerClient())
        .from('profiles')
        .select('owner_id')
        .eq('slug', slug)
        .neq('owner_id', ownerId)
        .maybeSingle()
      if (error) throw new Error('Unable to check profile URL')
      return !data
    },
    async getProfile(ownerId) {
      const { data, error } = await (await createServerClient())
        .from('profiles')
        .select('full_name,slug')
        .eq('owner_id', ownerId)
        .single()
      if (error || !data) throw new Error('Unable to load profile')
      return data
    },
    async completePublish(_ownerId, publish) {
      const { error } = await (await createServerClient())
        .rpc('complete_own_onboarding_publish', { p_publish: publish })
      if (error) throw new Error('Unable to publish profile')
    },
    completeStep: completeOnboardingStep,
    revalidate: revalidatePath,
    recordEvent(event, step) {
      logRegistrationEvent(event, { requestId: randomUUID(), outcome: 'success', step })
    },
  }
}
