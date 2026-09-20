import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609200001_allow_all_profile_templates.sql')

describe('profile template publish migration', () => {
  it('allows every dashboard template in the draft save RPC', () => {
    const migration = readFileSync(migrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ')

    expect(migration).toContain("not in ('minimal', 'cover', 'studio', 'executive', 'signal', 'index')")
  })
})
