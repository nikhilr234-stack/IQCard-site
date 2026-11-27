import { beforeEach, describe, expect, it, vi } from 'vitest'

const api = vi.hoisted(() => ({
  getAccount: vi.fn(), getProfile: vi.fn(), isSlugAvailable: vi.fn(),
}))
vi.mock('@/lib/onboarding/services', () => ({ createOnboardingActionServices: () => api }))
import { checkAddressOptions } from './onboarding'

describe('address suggestions', () => {
  beforeEach(() => {
    api.getAccount.mockResolvedValue({ id: 'owner-1' })
    api.getProfile.mockResolvedValue({ full_name: 'Ada Lovelace', slug: 'ada-lovelace' })
    api.isSlugAvailable.mockImplementation(async (_owner: string, slug: string) => !['ada', 'ada-2'].includes(slug))
  })

  it('recommends only checked available addresses based on the first name', async () => {
    const result = await checkAddressOptions('Ada')
    expect(result.available).toBe(false)
    expect(result.suggestions).toEqual(['ada-lovelace', 'ada-l', 'ada-3'])
    expect(result.suggestions).not.toContain('ada-2')
  })
})
