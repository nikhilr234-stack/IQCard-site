import { describe, expect, it, vi } from 'vitest'
import { createServerClient } from '@/lib/supabase/server'
import {
  completeOnboardingStep,
  firstIncompleteStep,
  getOnboardingProgress,
  onboardingPath,
  onboardingSteps,
  type OnboardingProgressStore,
} from './progress'

vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

describe('onboarding progress', () => {
  it('uses the canonical six-step order and produces safe paths', () => {
    expect(onboardingSteps).toEqual(['identity', 'contact', 'content', 'address', 'preview', 'publish'])
    expect(onboardingPath('identity')).toBe('/onboarding/identity')
    expect(onboardingPath('publish')).toBe('/onboarding/publish')
  })

  it('finds the first incomplete step and returns null when finished', () => {
    expect(firstIncompleteStep([])).toBe('identity')
    expect(firstIncompleteStep(['identity', 'contact'])).toBe('content')
    expect(firstIncompleteStep([...onboardingSteps])).toBeNull()
  })

  it('creates initial server progress when the owner has none', async () => {
    const store: OnboardingProgressStore = {
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn(async (progress) => progress),
    }

    const progress = await getOnboardingProgress('owner-1', { store, now: () => new Date('2026-09-05T10:00:00.000Z') })

    expect(progress).toMatchObject({ ownerId: 'owner-1', currentStep: 'identity', completedSteps: [], completedAt: null })
    expect(store.save).toHaveBeenCalledOnce()
  })

  it('completes the current step idempotently and advances to the next one', async () => {
    const existing = {
      ownerId: 'owner-1',
      currentStep: 'contact' as const,
      completedSteps: ['identity' as const],
      startedAt: '2026-09-05T09:00:00.000Z',
      updatedAt: '2026-09-05T09:00:00.000Z',
      completedAt: null,
    }
    const store: OnboardingProgressStore = {
      get: vi.fn().mockResolvedValue(existing),
      save: vi.fn(async (progress) => progress),
    }

    const first = await completeOnboardingStep('owner-1', 'contact', { store, now: () => new Date('2026-09-05T10:00:00.000Z') })
    expect(first.currentStep).toBe('content')
    expect(first.completedSteps).toEqual(['identity', 'contact'])

    store.get = vi.fn().mockResolvedValue(first)
    const repeated = await completeOnboardingStep('owner-1', 'contact', { store, now: () => new Date('2026-09-05T10:01:00.000Z') })
    expect(repeated.completedSteps).toEqual(['identity', 'contact'])
    expect(repeated.currentStep).toBe('content')
  })

  it('sets the completion timestamp after publish', async () => {
    const existing = {
      ownerId: 'owner-1',
      currentStep: 'publish' as const,
      completedSteps: onboardingSteps.slice(0, -1),
      startedAt: '2026-09-05T09:00:00.000Z',
      updatedAt: '2026-09-05T09:00:00.000Z',
      completedAt: null,
    }
    const store: OnboardingProgressStore = {
      get: vi.fn().mockResolvedValue(existing),
      save: vi.fn(async (progress) => progress),
    }

    const progress = await completeOnboardingStep('owner-1', 'publish', {
      store,
      now: () => new Date('2026-09-05T10:00:00.000Z'),
    })

    expect(progress.completedAt).toBe('2026-09-05T10:00:00.000Z')
    expect(progress.currentStep).toBe('publish')
  })

  it('rejects attempts to skip an incomplete step', async () => {
    const store: OnboardingProgressStore = {
      get: vi.fn().mockResolvedValue({
        ownerId: 'owner-1', currentStep: 'identity', completedSteps: [],
        startedAt: '2026-09-05T09:00:00.000Z', updatedAt: '2026-09-05T09:00:00.000Z', completedAt: null,
      }),
      save: vi.fn(),
    }

    await expect(completeOnboardingStep('owner-1', 'content', { store })).rejects.toThrow('Complete the earlier onboarding steps first')
    expect(store.save).not.toHaveBeenCalled()
  })

  it('starts durable progress through the narrow RPC without a direct table mutation', async () => {
    const row = {
      owner_id: 'owner-1', current_step: 'identity', completed_steps: [],
      started_at: '2026-09-05T09:00:00.000Z', updated_at: '2026-09-05T09:00:00.000Z', completed_at: null,
    }
    const upsert = vi.fn()
    const rpc = vi.fn().mockResolvedValue({ data: row, error: null })
    vi.mocked(createServerClient).mockResolvedValue({
      rpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
        })),
        upsert,
      })),
    } as never)

    const progress = await getOnboardingProgress('owner-1')

    expect(rpc).toHaveBeenCalledWith('start_own_onboarding')
    expect(upsert).not.toHaveBeenCalled()
    expect(progress).toMatchObject({ ownerId: 'owner-1', currentStep: 'identity', completedSteps: [] })
  })

  it('advances durable progress through an ordered step RPC without sending a forged step array', async () => {
    const currentRow = {
      owner_id: 'owner-1', current_step: 'contact', completed_steps: ['identity'],
      started_at: '2026-09-05T09:00:00.000Z', updated_at: '2026-09-05T09:00:00.000Z', completed_at: null,
    }
    const nextRow = { ...currentRow, current_step: 'content', completed_steps: ['identity', 'contact'] }
    const upsert = vi.fn()
    const rpc = vi.fn().mockResolvedValue({ data: nextRow, error: null })
    vi.mocked(createServerClient).mockResolvedValue({
      rpc,
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: currentRow, error: null }) })),
        })),
        upsert,
      })),
    } as never)

    const progress = await completeOnboardingStep('owner-1', 'contact')

    expect(rpc).toHaveBeenCalledWith('advance_own_onboarding_progress', { p_step: 'contact' })
    expect(upsert).not.toHaveBeenCalled()
    expect(progress).toMatchObject({ currentStep: 'content', completedSteps: ['identity', 'contact'] })
  })
})
