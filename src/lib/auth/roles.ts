import { onboardingPath } from '@/lib/onboarding/steps'
import type { OnboardingStep } from '@/lib/onboarding/types'

export type UserRole = 'client' | 'admin'

export function destinationForRole(role: UserRole): '/dashboard' | '/admin' {
  return role === 'admin' ? '/admin' : '/dashboard'
}

export function safeReturnPath(candidate: string | null): string | null {
  if (!candidate || candidate[0] !== '/' || candidate[1] === '/') {
    return null
  }

  if (candidate === '/' || /[\s\u0000-\u001f\u007f-\u009f\\]/u.test(candidate)) {
    return null
  }

  const rawPath = candidate.split(/[?#]/u, 1)[0]
  let decodedPath = rawPath

  for (let pass = 0; pass < 3; pass += 1) {
    if (
      decodedPath[0] !== '/'
      || decodedPath[1] === '/'
      || /[\s\u0000-\u001f\u007f-\u009f\\]/u.test(decodedPath)
      || /%(?:0[0-9a-f]|1[0-9a-f]|20|25|2f|5c|7f)/iu.test(decodedPath)
    ) {
      return null
    }

    try {
      const nextDecodedPath = decodeURIComponent(decodedPath)
      if (nextDecodedPath === decodedPath) break
      decodedPath = nextDecodedPath
    } catch {
      return null
    }
  }

  try {
    const base = new URL('https://return-path.invalid')
    const parsed = new URL(candidate, base)
    if (parsed.origin !== base.origin || parsed.username || parsed.password) return null
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return normalized[0] === '/' && normalized[1] !== '/' ? normalized : null
  } catch {
    return null
  }
}

export function isAdminEmail(email: string, allowList: Set<string>): boolean {
  return allowList.has(email.trim().toLowerCase())
}

export function roleForEmail(email: string, allowList: Set<string>): UserRole {
  return isAdminEmail(email, allowList) ? 'admin' : 'client'
}

export function resolvePostLoginPath(
  role: UserRole,
  nextPath: string | null,
  incompleteOnboardingStep: OnboardingStep | null = null,
): string {
  if (role === 'client' && incompleteOnboardingStep) return onboardingPath(incompleteOnboardingStep)
  return safeReturnPath(nextPath) ?? destinationForRole(role)
}

export function canAccessRoute(role: UserRole, pathname: '/dashboard' | '/admin'): boolean {
  return pathname === '/dashboard' || role === 'admin'
}
