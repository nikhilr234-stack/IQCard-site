import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202609080002_close_publication_boundary_bypasses.sql',
)
const rolloutPath = resolve(process.cwd(), 'docs/registration-rollout.md')

function sql(): string {
  return readFileSync(migrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

function functionBody(migration: string, name: string): string {
  const match = migration.match(new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b[\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$`,
  ))
  expect(match, `missing ${name} function`).not.toBeNull()
  return match?.[1] ?? ''
}

describe('publication-boundary migration', () => {
  it('revokes raw authenticated profile creation and replaces it with owner- and service-controlled draft creation', () => {
    const migration = sql()
    const ownerDraft = functionBody(migration, 'create_own_profile_draft')
    const adminDraft = functionBody(migration, 'admin_create_profile_draft')

    expect(migration).toContain('revoke all privileges on table public.profiles from authenticated')
    expect(migration).not.toMatch(/grant insert(?: \([^)]*\))? on table public\.profiles to authenticated/)
    expect(migration).toContain('drop policy if exists "owners create their profile" on public.profiles')
    expect(migration).toContain('insert into public.onboarding_progress')
    expect(ownerDraft).toContain('auth.uid()')
    expect(ownerDraft).toContain("on conflict (owner_id) do nothing")
    expect(ownerDraft).toContain('insert into public.onboarding_progress')
    expect(migration).toMatch(/grant execute on function public\.create_own_profile_draft\([^)]*\) to authenticated/)
    expect(migration).toMatch(/grant execute on function public\.admin_create_profile_draft\([^)]*\) to service_role/)
    expect(adminDraft).toContain('insert into public.onboarding_progress')
  })

  it('uses PostgreSQL-correct regexes while keeping genuine legacy publication and blocking new incomplete v2 drafts', () => {
    const body = functionBody(sql(), 'complete_own_onboarding_publish')
    const prerequisites = functionBody(sql(), 'assert_own_onboarding_prerequisites')
    const profileWrite = body.indexOf('update public.profiles')

    expect(prerequisites).toContain("pg_catalog.regexp_split_to_array(pg_catalog.btrim(v_profile.full_name), '\\s+')")
    expect(prerequisites).toContain("!~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'")
    expect(body).toContain('v_has_progress := found')
    expect(body).toContain("registration_intents.status = 'claimed'")
    expect(body).toContain('if v_has_progress then')
    expect(body).toContain("array['identity', 'contact', 'content', 'address', 'preview']::text[] <@ v_completed_steps")
    expect(body).toContain('elsif v_has_claimed_registration then')
    expect(body.indexOf('elsif v_has_claimed_registration then')).toBeLessThan(profileWrite)
    expect(body.slice(0, profileWrite)).not.toContain('if not found then raise sqlstate')
  })

  it('removes raw link writes and requires one validated, ordered atomic link replacement boundary', () => {
    const migration = sql()
    const links = functionBody(migration, 'replace_own_profile_links')
    const prerequisites = functionBody(migration, 'assert_profile_publication_prerequisites')

    expect(migration).toContain('revoke all privileges on table public.profile_links from authenticated')
    expect(migration).toMatch(/grant select on table public\.profile_links to authenticated/)
    expect(links).toContain("pg_catalog.jsonb_array_length(p_links) > 12")
    expect(migration).toContain('create or replace function public.is_valid_profile_link')
    expect(links).toContain('public.is_valid_profile_link')
    expect(prerequisites).toContain('public.is_valid_profile_link')
    expect(migration).toContain('https?://')
    expect(migration).toContain('mailto:')
    expect(migration).toContain('2048')
    expect(links).toContain('with ordinality')
    expect(links.indexOf('delete from public.profile_links')).toBeLessThan(links.indexOf('insert into public.profile_links'))
  })

  it('enforces publication validity on ordinary published-row edits without trigger recursion', () => {
    const migration = sql()
    const trigger = functionBody(migration, 'enforce_published_profile_validity')

    expect(migration).toContain('create trigger enforce_published_profile_validity before update on public.profiles')
    expect(trigger).toContain("if new.status = 'published' then")
    expect(migration).toContain('create or replace function public.assert_profile_publication_prerequisites')
    expect(trigger).toContain("perform public.assert_profile_publication_prerequisites(new, 'publish')")
    expect(trigger).not.toContain('update public.profiles')
  })

  it('matches shared identity and content limits at every publishing boundary', () => {
    const migration = sql()
    const prerequisites = functionBody(migration, 'assert_profile_publication_prerequisites')

    expect(prerequisites).toContain("pg_catalog.lower(v_normalized_name) = 'your name'")
    expect(prerequisites).toContain('> 80')
    expect(prerequisites).toContain("v_name_parts[2:pg_catalog.array_length(v_name_parts, 1)]")
    expect(prerequisites).toContain('pg_catalog.length(p_profile.headline) > 120')
    expect(prerequisites).toContain('pg_catalog.length(p_profile.bio) > 500')
    expect(prerequisites).toContain("raise sqlstate 'p0001' using message = 'complete your identity first'")
    expect(prerequisites).toContain("raise sqlstate 'p0001' using message = 'complete your profile content first'")
  })

  it('documents both additive publication-hardening migrations as mandatory after 060002', () => {
    const rollout = readFileSync(rolloutPath, 'utf8')
    const expectedOrder = [
      '202608300001_create_user_accounts',
      '202608300002_create_profiles',
      '202609050001_create_checkout_handoffs',
      '202609050002_create_registration_intents',
      '202609050003_create_onboarding_progress',
      '202609050004_add_onboarding_profile_fields',
      '202609050005_create_registration_rate_limits',
      '202609060001_fix_claim_registration_intent_status_ambiguity',
      '202609060002_secure_profiles_and_atomic_writes',
      '202609080001_harden_publication_boundary',
      '202609080002_close_publication_boundary_bypasses',
    ]
    let previousIndex = -1
    for (const migration of expectedOrder) {
      const index = rollout.indexOf(migration)
      expect(index, `missing ${migration}`).toBeGreaterThan(previousIndex)
      previousIndex = index
    }
    expect(rollout).toMatch(/mandatory additive security hardening migrations/i)
  })

  it('uses a bounded numeric port contract from the link RPC through the publish guard', () => {
    const migration = sql()
    const links = functionBody(migration, 'replace_own_profile_links')
    const prerequisites = functionBody(migration, 'assert_profile_publication_prerequisites')

    expect(migration).toContain('6553[0-5]')
    expect(migration).toContain('(?::(?:[1-9][0-9]{0,3}')
    expect(migration).not.toContain('\\[[0-9a-f:.]*:[0-9a-f:.]*\\]')
    expect(migration).toContain('25[0-5]')
    expect(migration).toContain('[a-z0-9-]{0,61}')
    expect(migration).toContain('create or replace function public.decode_profile_link_percent')
    expect(migration).toContain('decode_profile_link_percent')
    expect(links).toContain('public.is_valid_profile_link')
    expect(prerequisites).toContain('public.is_valid_profile_link')
  })
})
