import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260926112738_add_gift_profile_claims.sql'), 'utf8')

describe('gift profile claim migration', () => {
  it('supports unowned live profiles while retaining one owned profile per user', () => {
    expect(migration).toContain('alter table public.profiles alter column owner_id drop not null')
    expect(migration).toMatch(/where owner_id is not null/)
    expect(migration).toContain("v_profile.status <> 'published'")
  })

  it('keeps claim records private and restricts provisioning to service role', () => {
    expect(migration).toContain('alter table public.profile_gift_claims enable row level security')
    expect(migration).toContain('revoke all privileges on table public.profile_gift_claims from public, anon, authenticated, service_role')
    expect(migration).toContain('to service_role')
  })

  it('derives the claimant from auth.uid and checks the verified JWT email atomically', () => {
    expect(migration).toContain('v_owner_id uuid := auth.uid()')
    expect(migration).toContain('users.email_confirmed_at is not null')
    expect(migration).toContain('for update')
    expect(migration).toContain("set status = 'claimed', claimed_by = v_owner_id, claimed_at = pg_catalog.now()")
  })
})
