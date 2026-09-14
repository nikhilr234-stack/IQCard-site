export type RegistrationRecoveryReason =
  | 'registration-expired'
  | 'registration-used'
  | 'registration-email-mismatch'
  | 'registration-missing'
  | 'registration-unavailable'

type RecoveryContent = { title: string; message: string; actionLabel: string; actionHref: string }

const recoveryContent: Record<RegistrationRecoveryReason, RecoveryContent> = {
  'registration-expired': {
    title: 'Your registration link expired.',
    message: 'Your card design is still saved in this browser. Return to it and request a fresh secure link.',
    actionLabel: 'Return to your saved card',
    actionHref: '/customize',
  },
  'registration-used': {
    title: 'That registration link has already been used.',
    message: 'Sign in again to continue from your saved onboarding step.',
    actionLabel: 'Continue to sign in',
    actionHref: '/login',
  },
  'registration-email-mismatch': {
    title: 'This link belongs to a different sign-in email.',
    message: 'Open the link while signed in with the address that requested it, or return to your card and send a fresh link.',
    actionLabel: 'Return to your saved card',
    actionHref: '/customize',
  },
  'registration-missing': {
    title: 'We could not find that saved registration.',
    message: 'Your local card design has not been removed. Return to it to start a fresh registration.',
    actionLabel: 'Return to your saved card',
    actionHref: '/customize',
  },
  'registration-unavailable': {
    title: 'We could not finish registration right now.',
    message: 'Nothing was published. Please return to your saved card and try again in a moment.',
    actionLabel: 'Return to your saved card',
    actionHref: '/customize',
  },
}

export function registrationRecoveryContent(reason: string | undefined): RecoveryContent | null {
  return recoveryContent[reason as RegistrationRecoveryReason] ?? null
}
