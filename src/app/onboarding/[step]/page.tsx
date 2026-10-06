import { notFound, redirect } from 'next/navigation'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getOnboardingProgress, onboardingPath, onboardingSteps } from '@/lib/onboarding/progress'
import type { OnboardingStep } from '@/lib/onboarding/types'
import { getOwnProfile } from '@/lib/profile/repository'
import { getLatestClaimedRegistrationIntent } from '@/lib/registration/repository'
import { OnboardingWizard } from '../onboarding-wizard'
import { discoverOwnGiftProfile } from '@/lib/gifts/claims'
import { getPublicEnv } from '@/lib/env'

export const dynamic = 'force-dynamic'

export default async function OnboardingStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step: requestedStep } = await params
  if (!onboardingSteps.includes(requestedStep as OnboardingStep)) notFound()
  const step = requestedStep as OnboardingStep
  const account = await requireAuthenticatedAccount()
  if ((await discoverOwnGiftProfile()).status !== 'none') redirect('/claim-gift')
  const [progress, registration] = await Promise.all([
    getOnboardingProgress(account.id),
    getLatestClaimedRegistrationIntent(account.id),
  ])
  const preferredName = registration ? `${registration.first_name} ${registration.last_name}` : null
  const profile = await getOwnProfile(account, preferredName)

  if (progress.completedAt) redirect('/dashboard')
  if (onboardingSteps.indexOf(step) > onboardingSteps.indexOf(progress.currentStep)) {
    redirect(onboardingPath(progress.currentStep))
  }

  return <OnboardingWizard step={step} profile={profile} verifiedEmail={account.email} designId={registration?.design_id ?? null} siteUrl={getPublicEnv().siteUrl} />
}
