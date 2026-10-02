import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20261002053204_digital_profile_unified_save.sql'), 'utf8').toLowerCase()

function functionBody(name: string) {
  const start = sql.indexOf(`function public.${name}`)
  if (start === -1) return ''
  const end = sql.indexOf('$$;', start)
  return sql.slice(start, end === -1 ? undefined : end)
}

describe('digital profile save migration', () => {
  it('restores validated owner-only profile link saves', () => {
    const body = functionBody('replace_own_profile_links')
    expect(body).toContain('security definer')
    expect(body).toContain('auth.uid()')
    expect(body).toContain('jsonb_array_length(p_links) > 12')
    expect(body).toContain('public.is_valid_profile_link')
    expect(body).toContain('for update')
    expect(body).toContain('with ordinality')
    expect(sql).toContain('grant execute on function public.replace_own_profile_links(jsonb) to authenticated')
  })

  it('saves profile details, links, and presentation in one owner-bound transaction', () => {
    const body = functionBody('save_own_digital_profile')
    expect(body).toContain('security definer')
    expect(body).toContain('auth.uid()')
    expect(body).toContain('for update')
    expect(body).toContain('public.replace_own_profile_links(p_links)')
    expect(body).toContain("tagline = pg_catalog.btrim(p_profile->>'tagline')")
    expect(body).toContain('public.save_own_profile_presentation(p_draft)')
    expect(body).toContain("v_profile.status = 'published'")
    expect(body).toContain('public.publish_own_profile_presentation()')
    expect(sql).toContain('grant execute on function public.save_own_digital_profile(jsonb, jsonb, jsonb) to authenticated')
  })

  it('closes direct authenticated link writes and protects published profile edits', () => {
    expect(sql).toContain('revoke all privileges on table public.profile_links from authenticated')
    expect(sql).toContain('grant select on table public.profile_links to authenticated')
    expect(sql).toContain('create trigger enforce_published_profile_validity')
    expect(sql).toContain('before update on public.profiles')
    expect(sql).toContain('create or replace function public.assert_profile_publication_prerequisites')
    expect(sql).toContain('grant update (')
  })
})
