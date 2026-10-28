import { afterEach, describe, expect, it, vi } from 'vitest'
import { runOnboardingStep, type OnboardingActionServices } from '@/lib/onboarding/action-runner'
import { createOnboardingActionServices } from '@/lib/onboarding/services'
import { createServerClient } from '@/lib/supabase/server'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

function services(): OnboardingActionServices & Record<string, ReturnType<typeof vi.fn>> {
  return {
    getAccount: vi.fn().mockResolvedValue({ id: 'owner-1', email: 'owner@example.com' }),
    updateProfile: vi.fn().mockResolvedValue(undefined),
    replaceLinks: vi.fn().mockResolvedValue(undefined),
    isSlugAvailable: vi.fn().mockResolvedValue(true),
    getProfile: vi.fn().mockResolvedValue({ full_name: 'Nikhil Rakesh', slug: 'nikhil-rakesh' }),
    completePublish: vi.fn().mockResolvedValue(undefined),
    completeStep: vi.fn().mockResolvedValue({ currentStep: 'contact' }),
    revalidate: vi.fn(),
  }
}

describe('onboarding server action runner', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('asks the customer for both name fields before allowing them to continue', async () => {
    const api = services()
    const form = new FormData()
    form.set('firstName', 'Nikhil')

    const state = await runOnboardingStep('identity', form, api)

    expect(state).toEqual({ ok: false, fieldErrors: { lastName: 'Enter your last name.' } })
    expect(api.updateProfile).not.toHaveBeenCalled()
    expect(api.completeStep).not.toHaveBeenCalled()
  })

  it('saves valid identity data and progress before returning the next path', async () => {
    const api = services()
    const form = new FormData()
    form.set('firstName', 'Nikhil')
    form.set('lastName', 'Rakesh')
    form.set('headline', 'Founder')
    form.set('bio', 'Building useful things.')

    const state = await runOnboardingStep('identity', form, api)

    expect(api.updateProfile).toHaveBeenCalledWith('owner-1', {
      full_name: 'Nikhil Rakesh', headline: 'Founder', bio: 'Building useful things.',
    })
    expect(api.completeStep).toHaveBeenCalledWith('owner-1', 'identity')
    expect(state).toEqual({ ok: true, fieldErrors: {}, next: '/onboarding/contact' })
  })

  it('returns deterministic alternatives when a public address is unavailable', async () => {
    const api = services()
    vi.mocked(api.isSlugAvailable).mockResolvedValue(false)
    const form = new FormData()
    form.set('slug', 'Nikhil Rakesh')

    const state = await runOnboardingStep('address', form, api)

    expect(state).toMatchObject({
      ok: false,
      fieldErrors: { slug: 'That profile URL is already taken.' },
      alternatives: ['nikhil-rakesh-2', 'nikhil-rakesh-3'],
    })
    expect(api.updateProfile).not.toHaveBeenCalled()
  })

  it('submits the ready profile privately for administrator review', async () => {
    const api = services()
    const state = await runOnboardingStep('publish', new FormData(), api)

    expect(api.completePublish).toHaveBeenCalledWith('owner-1', false)
    expect(api.completeStep).not.toHaveBeenCalled()
    expect(state).toEqual({ ok: true, fieldErrors: {}, next: '/dashboard' })
  })

  it('keeps the profile private and completes progress in the same atomic call', async () => {
    const api = services()
    const form = new FormData()
    form.set('mode', 'private')

    const state = await runOnboardingStep('publish', form, api)

    expect(api.completePublish).toHaveBeenCalledWith('owner-1', false)
    expect(api.completeStep).not.toHaveBeenCalled()
    expect(state).toEqual({ ok: true, fieldErrors: {}, next: '/dashboard' })
  })

  it('replaces onboarding links through the authenticated atomic RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null })
    const from = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { id: 'profile-1' }, error: null }),
            })),
          })),
        }
      }
      return {
        delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
        insert: vi.fn().mockResolvedValue({ error: null }),
      }
    })
    vi.mocked(createServerClient).mockResolvedValue({ from, rpc } as never)
    const links = [{ label: 'Website', url: 'https://example.com' }]

    await createOnboardingActionServices().replaceLinks('owner-1', links)

    expect(rpc).toHaveBeenCalledWith('replace_own_profile_links', { p_links: links })
    expect(from).not.toHaveBeenCalledWith('profile_links')
  })
})
