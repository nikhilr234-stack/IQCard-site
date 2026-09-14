export type MagicLinkErrorReason = 'rate-limited' | 'not-authorized' | 'failed'

type AuthErrorLike = {
  status?: number
  code?: string
  message?: string
}

export function magicLinkErrorReason(error: AuthErrorLike): MagicLinkErrorReason {
  const text = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()

  if (error.status === 429 || text.includes('rate limit') || text.includes('too many')) return 'rate-limited'
  if (text.includes('not authorized') || text.includes('not_authorized')) return 'not-authorized'
  return 'failed'
}

export function magicLinkErrorMessage(reason: MagicLinkErrorReason): string {
  if (reason === 'rate-limited') return 'Too many requests right now. Please wait a little and try again.'
  if (reason === 'not-authorized') return 'This email service is still in setup mode. Please contact the administrator.'
  return 'Unable to send a sign-in link. Please try again.'
}
