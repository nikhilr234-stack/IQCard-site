import { createServerClient } from '@/lib/supabase/server'
import type { OnboardingProgress, OnboardingStep } from './types'
import { firstIncompleteStep, onboardingSteps } from './steps'
export { firstIncompleteStep, onboardingPath, onboardingSteps } from './steps'

const onboardingStepSet = new Set<OnboardingStep>(onboardingSteps)

export interface OnboardingProgressStore {
  get(ownerId: string): Promise<OnboardingProgress | null>
  save(progress: OnboardingProgress): Promise<OnboardingProgress>
}

type ProgressDependencies = {
  store?: OnboardingProgressStore
  now?: () => Date
}

type ProgressRow = {
  owner_id?: unknown
  current_step?: unknown
  completed_steps?: unknown
  started_at?: unknown
  updated_at?: unknown
  completed_at?: unknown
}

function isOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === 'string' && onboardingStepSet.has(value as OnboardingStep)
}

function progressFromRow(row: ProgressRow): OnboardingProgress {
  if (
    typeof row.owner_id !== 'string'
    || !isOnboardingStep(row.current_step)
    || !Array.isArray(row.completed_steps)
    || !row.completed_steps.every(isOnboardingStep)
    || typeof row.started_at !== 'string'
    || typeof row.updated_at !== 'string'
    || (row.completed_at !== null && typeof row.completed_at !== 'string')
  ) {
    throw new Error('Invalid onboarding progress')
  }

  const completed = new Set(row.completed_steps)
  return {
    ownerId: row.owner_id,
    currentStep: row.current_step,
    completedSteps: onboardingSteps.filter((step) => completed.has(step)),
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  }
}

function progressFromRpcData(data: unknown): OnboardingProgress {
  const row = Array.isArray(data) ? data[0] : data
  if (!row || typeof row !== 'object') throw new Error('Missing onboarding progress')
  return progressFromRow(row as ProgressRow)
}

function createSupabaseProgressStore(): OnboardingProgressStore {
  return {
    async get(ownerId) {
      const { data, error } = await (await createServerClient())
        .from('onboarding_progress')
        .select('*')
        .eq('owner_id', ownerId)
        .maybeSingle()
      if (error) throw error
      return data ? progressFromRow(data) : null
    },
    async save(progress) {
      const supabase = await createServerClient()
      const completedStep = progress.completedSteps.at(-1)
      const { data, error } = completedStep
        ? await supabase.rpc('advance_own_onboarding_progress', { p_step: completedStep })
        : await supabase.rpc('start_own_onboarding')
      if (!error) return progressFromRpcData(data)

      // Fallback for projects where the latest RPC migration is not applied yet.
      if (!completedStep) {
        const { data: inserted, error: insertError } = await supabase
          .from('onboarding_progress')
          .upsert({ owner_id: progress.ownerId, current_step: progress.currentStep, completed_steps: progress.completedSteps, completed_at: progress.completedAt }, { onConflict: 'owner_id' })
          .select('*')
          .single()
        if (insertError) throw error
        return progressFromRow(inserted)
      }
      const { data: updated, error: updateError } = await supabase
        .from('onboarding_progress')
        .update({ current_step: progress.currentStep, completed_steps: progress.completedSteps, completed_at: progress.completedAt })
        .eq('owner_id', progress.ownerId)
        .select('*')
        .single()
      if (updateError) throw error
      return progressFromRow(updated)
    },
  }
}

export async function getOnboardingProgress(
  ownerId: string,
  dependencies: ProgressDependencies = {},
): Promise<OnboardingProgress> {
  if (!ownerId) throw new Error('Unable to load onboarding progress')
  const store = dependencies.store ?? createSupabaseProgressStore()

  try {
    const existing = await store.get(ownerId)
    if (existing) return existing

    const timestamp = (dependencies.now ?? (() => new Date()))().toISOString()
    return await store.save({
      ownerId,
      currentStep: 'identity',
      completedSteps: [],
      startedAt: timestamp,
      updatedAt: timestamp,
      completedAt: null,
    })
  } catch {
    throw new Error('Unable to load onboarding progress')
  }
}

export async function completeOnboardingStep(
  ownerId: string,
  step: OnboardingStep,
  dependencies: ProgressDependencies = {},
): Promise<OnboardingProgress> {
  const store = dependencies.store ?? createSupabaseProgressStore()
  const progress = await getOnboardingProgress(ownerId, { ...dependencies, store })
  if (progress.completedSteps.includes(step)) return progress

  const requiredStep = firstIncompleteStep(progress.completedSteps)
  if (requiredStep !== step) throw new Error('Complete the earlier onboarding steps first')

  const timestamp = (dependencies.now ?? (() => new Date()))().toISOString()
  const completedSteps = [...progress.completedSteps, step]
  const nextStep = firstIncompleteStep(completedSteps)

  try {
    return await store.save({
      ...progress,
      currentStep: nextStep ?? 'publish',
      completedSteps,
      updatedAt: timestamp,
      completedAt: nextStep ? null : timestamp,
    })
  } catch {
    throw new Error('Unable to save onboarding progress')
  }
}
