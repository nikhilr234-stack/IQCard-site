export type AdminActionError = 'invalid-email' | 'auth-lookup-failed' | 'auth-lookup-limit' | 'invite-failed' | 'account-failed' | 'account-role-conflict' | 'profile-failed' | 'client-not-found'

export function adminActionMessage(reason: string | undefined): string | null {
  if (reason === 'invalid-email') return 'Please enter a valid email address for the client.'
  if (reason === 'auth-lookup-failed' || reason === 'auth-lookup-limit') return 'Client accounts could not be checked safely. Please try again.'
  if (reason === 'invite-failed') return 'The access link could not be sent. Please try again.'
  if (reason === 'account-failed') return 'The client account could not be prepared. Please try again.'
  if (reason === 'account-role-conflict') return 'That email belongs to an administrator account and cannot be onboarded as a client.'
  if (reason === 'profile-failed') return 'The client profile could not be created. Please try again.'
  if (reason === 'client-not-found') return 'That client could not be found.'
  return null
}
