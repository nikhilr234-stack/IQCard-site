import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const path = resolve(process.cwd(), 'supabase/migrations/20260926225500_update_unclaimed_gift_profile.sql')

describe('unclaimed gift edit migration', () => {
  it('makes claimed gifts read-only and uses claim-first row locking', () => {
    const sql = readFileSync(path, 'utf8').toLowerCase().replace(/\s+/g, ' ')
    expect(sql).toContain('from public.profile_gift_claims')
    expect(sql).toContain("profile_gift_claims.status = 'unclaimed'")
    expect(sql).toContain('profiles.owner_id is null')
    expect(sql.indexOf('from public.profile_gift_claims')).toBeLessThan(sql.indexOf('from public.profiles'))
  })

  it('keeps existing media paths untouched and grants edit access only to the server role', () => {
    const sql = readFileSync(path, 'utf8').toLowerCase().replace(/\s+/g, ' ')
    expect(sql).toContain('public.is_valid_profile_link')
    expect(sql).toContain('set draft = v_presentation, published = v_presentation')
    expect(sql).not.toMatch(/set[^;]*(photo_path|coverpath)/)
    expect(sql).toContain('grant execute on function public.admin_update_unclaimed_gift_profile')
    expect(sql).toContain('to service_role')
    expect(sql).not.toMatch(/create\s+(table|schema)\b/)
  })
})
