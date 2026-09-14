import type { EmailOtpType } from '@supabase/supabase-js'

const supportedTypes = new Set<EmailOtpType>(['email', 'invite', 'recovery', 'email_change'])

export function parseEmailOtpType(value: string | null): EmailOtpType | null {
  return value && supportedTypes.has(value as EmailOtpType) ? value as EmailOtpType : null
}
