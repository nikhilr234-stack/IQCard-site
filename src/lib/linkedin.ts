type LinkedInEnvironment = Record<string, string | undefined>

export type LinkedInProfile = { name?: unknown; email?: unknown; picture?: unknown; [key: string]: unknown }

export class LinkedInTemporaryFailure extends Error {
  readonly code = 'temporary_error' as const
  readonly cause: unknown

  constructor(cause: unknown) {
    super('LinkedIn is temporarily unavailable.')
    this.name = 'LinkedInTemporaryFailure'
    this.cause = cause
  }
}

export async function fetchLinkedInJson<T>(url: string | URL, init: RequestInit, timeoutMs: number): Promise<{ response: Response; data: T | null }> {
  const controller = new AbortController()
  const sourceSignal = init.signal
  const forwardAbort = () => controller.abort(sourceSignal?.reason)

  if (sourceSignal?.aborted) forwardAbort()
  else sourceSignal?.addEventListener('abort', forwardAbort, { once: true })

  const timeout = setTimeout(() => controller.abort(new DOMException('LinkedIn request timed out.', 'TimeoutError')), Math.max(0, timeoutMs))

  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) return { response, data: null }
    return { response, data: await response.json() as T }
  } catch (error) {
    throw new LinkedInTemporaryFailure(error)
  } finally {
    clearTimeout(timeout)
    sourceSignal?.removeEventListener('abort', forwardAbort)
  }
}

export function isLinkedInImportConfigured(environment: LinkedInEnvironment = process.env) {
  return Boolean(environment.LINKEDIN_CLIENT_ID?.trim() && environment.LINKEDIN_CLIENT_SECRET?.trim())
}

export function mapLinkedInProfile(profile: LinkedInProfile) {
  return {
    full_name: typeof profile.name === 'string' ? profile.name.trim() : '',
    email: typeof profile.email === 'string' ? profile.email.trim() : '',
    picture: typeof profile.picture === 'string' ? profile.picture : '',
  }
}

export const LINKEDIN_AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization'
export const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
export const LINKEDIN_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo'
export const LINKEDIN_REQUEST_TIMEOUT_MS = 10_000
