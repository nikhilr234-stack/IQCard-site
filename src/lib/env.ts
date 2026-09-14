type Environment = Record<string, string | undefined>

export type PublicEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
  siteUrl: string
}

function required(name: string, environment: Environment): string {
  const value = environment[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export function parseAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  )
}

export function getPublicEnv(environment: Environment = process.env): PublicEnv {
  const siteUrl = required('NEXT_PUBLIC_SITE_URL', environment).replace(/\/$/, '')

  try {
    new URL(siteUrl)
  } catch {
    throw new Error('NEXT_PUBLIC_SITE_URL must be a valid URL')
  }

  return {
    supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL', environment),
    supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY', environment),
    siteUrl,
  }
}

export function getAdminEmails(environment: Environment = process.env): Set<string> {
  return parseAdminEmails(environment.IQCARD_ADMIN_EMAILS)
}

export function getServiceRoleKey(environment: Environment = process.env): string {
  return required('SUPABASE_SERVICE_ROLE_KEY', environment)
}
