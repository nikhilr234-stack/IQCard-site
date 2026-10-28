import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261005085331_require_admin_profile_approval.sql'), 'utf8').toLowerCase().replace(/\s+/g, ' ')

describe('administrator publication approval migration', () => {
  it('blocks clients from publishing their own profiles while preserving private submission and admin publication', () => {
    expect(migration).toContain("if p_publish and v_role = 'client' then")
    expect(migration).toContain("raise sqlstate '42501' using message = 'publication requires administrator approval'")
    expect(migration).toContain("case when p_publish then 'published' else 'draft' end")
    expect(migration).toContain('grant execute on function public.complete_own_onboarding_publish(boolean) to authenticated')
    expect(migration).not.toContain('revoke all on function public.admin_set_profile_publication')
  })
})
