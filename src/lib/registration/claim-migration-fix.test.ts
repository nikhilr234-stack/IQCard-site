import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609060001_fix_claim_registration_intent_status_ambiguity.sql')

describe('registration claim ambiguity fix migration', () => {
  it('qualifies lifecycle status references that conflict with the function output column', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

    expect(sql).toContain('create or replace function public.claim_registration_intent')
    expect(sql).toContain('registration_intents.status = \'pending\'')
    expect(sql).toContain("set status = 'expired'")
    expect(sql).not.toContain('where token_hash = p_token_hash and status = \'pending\'')
  })
})
