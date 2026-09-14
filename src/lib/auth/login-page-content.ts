import type { MagicLinkErrorReason } from './messages'
import { safeReturnPath } from './roles'

const LOGIN_ERROR_REASONS: MagicLinkErrorReason[] = ['rate-limited', 'not-authorized', 'failed']

type LoginSearchParams = {
  error?: string
  next?: string
  sent?: string
}

export function getLoginPageState(params: LoginSearchParams) {
  const error = LOGIN_ERROR_REASONS.includes(params.error as MagicLinkErrorReason)
    ? params.error as MagicLinkErrorReason
    : params.error
      ? 'failed'
      : null

  return {
    sent: params.sent === '1',
    error,
    next: safeReturnPath(params.next ?? null) ?? '',
  }
}
