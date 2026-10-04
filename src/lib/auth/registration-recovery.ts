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
    message: 'Return to your saved card in the browser where you designed it and request a fresh secure link. If you already claimed the card, sign in to open your dashboard.',
    actionLabel: 'Return to your saved card',
    actionHref: '/customize?restore=1',
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
    actionHref: '/customize?restore=1',
  },
  'registration-missing': {
    title: 'We could not find that saved registration.',
    message: 'Return to the browser where you designed your card to recover its local copy and request a fresh link.',
    actionLabel: 'Return to your saved card',
    actionHref: '/customize?restore=1',
  },
  'registration-unavailable': {
    title: 'We could not finish registration right now.',
    message: 'Nothing was published. Please return to your saved card and try again in a moment.',
    actionLabel: 'Return to your saved card',
    actionHref: '/customize?restore=1',
  },
}

export function registrationRecoveryContent(reason: string | undefined): RecoveryContent | null {
  return recoveryContent[reason as RegistrationRecoveryReason] ?? null
}
