import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609050003_create_onboarding_progress.sql')

describe('onboarding progress migration', () => {
  it('persists one versioned, private progress record per owner', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()
    expect(sql).toContain('create table public.onboarding_progress')
    expect(sql).toContain('owner_id uuid primary key')
    expect(sql).toContain('schema_version integer not null default 1')
    expect(sql).toContain('completed_steps text[]')
    expect(sql).toContain('completed_at timestamptz')
    expect(sql).toContain('alter table public.onboarding_progress enable row level security')
    expect(sql).toContain('owner_id = auth.uid()')
    expect(sql).toContain('create trigger on_onboarding_progress_updated')
    expect(sql).toContain("from public.profiles\nwhere status = 'published'")
    expect(sql).toContain('on conflict (owner_id) do nothing')
  })
})
