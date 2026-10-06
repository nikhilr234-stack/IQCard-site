import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getOnboardingProgress, onboardingPath, onboardingSteps } from '@/lib/onboarding/progress'
import { onboardingStepLabels } from './onboarding-styles'

export const dynamic = 'force-dynamic'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const account = await requireAuthenticatedAccount()
  const progress = await getOnboardingProgress(account.id)

  return <main className="onboarding-shell">
    <header className="onboarding-topbar">
      <Link href="/" className="onboarding-logo" data-iq-brand="primary" aria-label="IQ Card home">iq</Link>
      <div><strong>Set up your IQ</strong><span>Private until you publish</span></div>
      <nav className="onboarding-account-actions" aria-label="Account controls">
        <Link href="/dashboard" className="onboarding-exit">Save &amp; exit</Link>
        <SignOutButton />
      </nav>
    </header>
    <nav className="onboarding-progress" aria-label="Onboarding progress">
      {onboardingSteps.map((step, index) => {
        const complete = progress.completedSteps.includes(step)
        const current = progress.currentStep === step && !progress.completedAt
        return <Link key={step} href={onboardingPath(step)} aria-current={current ? 'step' : undefined} className={complete ? 'is-complete' : current ? 'is-current' : ''}>
          <span>{complete ? '✓' : String(index + 1).padStart(2, '0')}</span>{onboardingStepLabels[step]}
        </Link>
      })}
    </nav>
    {children}
  </main>
}
