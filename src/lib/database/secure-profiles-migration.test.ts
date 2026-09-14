import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609060002_secure_profiles_and_atomic_writes.sql')

function migrationSql(): string {
  return readFileSync(migrationPath, 'utf8').toLowerCase()
}

function compact(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim()
}

function functionBody(sql: string, functionName: string): string {
  const match = sql.match(new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}\\b[\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$`))
  expect(match, `missing ${functionName} function`).not.toBeNull()
  return match?.[1] ?? ''
}

describe('secure profiles and atomic writes migration', () => {
  it('limits published image reads to objects referenced by published profiles and lets owners read their objects', () => {
    const sql = compact(migrationSql())
    expect(sql).toContain('drop policy if exists "published profile images are readable" on storage.objects')
    expect(sql).toContain("exists ( select 1 from public.profiles where profiles.photo_path = storage.objects.name and profiles.status = 'published' )")
    expect(sql).toMatch(/create policy "owners read their own profile image" on storage\.objects for select to authenticated using \([^;]*storage\.foldername\(storage\.objects\.name\)[^;]*auth\.uid\(\)/)
  })

  it('defines authenticated, RLS-scoped profile RPCs with safe search paths and caller identity checks', () => {
    const sql = compact(migrationSql())
    for (const functionName of ['replace_own_profile_links', 'complete_own_onboarding_publish']) {
      expect(sql).toMatch(new RegExp(`create or replace function public\\.${functionName}\\b[\\s\\S]*?security invoker[\\s\\S]*?set search_path = ''`))
      expect(functionBody(sql, functionName)).toContain('auth.uid()')
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${functionName}\\([^)]*\\) to authenticated`))
      expect(sql).toMatch(new RegExp(`revoke all on function public\\.${functionName}\\([^)]*\\) from public, anon, service_role`))
    }
  })

  it('replaces the caller profile links in one ordered database operation', () => {
    const body = compact(functionBody(migrationSql(), 'replace_own_profile_links'))
    expect(body).toContain('delete from public.profile_links')
    expect(body).toContain('insert into public.profile_links')
    expect(body.indexOf('delete from public.profile_links')).toBeLessThan(body.indexOf('insert into public.profile_links'))
    expect(body).toContain('with ordinality')
    expect(body).toContain('(link.ordinality - 1)::integer')
    expect(body).not.toContain('exception when')
  })

  it('updates publication and completed publish progress in one database operation', () => {
    const body = compact(functionBody(migrationSql(), 'complete_own_onboarding_publish'))
    expect(body).toContain('from public.onboarding_progress')
    expect(body).toContain('for update')
    expect(body).toContain("array['identity', 'contact', 'content', 'address', 'preview']::text[] <@ v_completed_steps")
    expect(body).toContain("raise sqlstate 'p0001' using message = 'complete the earlier onboarding steps first'")
    expect(body.indexOf('from public.onboarding_progress')).toBeLessThan(body.indexOf('update public.profiles'))
    expect(body).toContain('update public.profiles')
    expect(body).toContain('insert into public.onboarding_progress')
    expect(body).toContain('on conflict (owner_id) do update')
    expect(body).toContain("'publish'")
    expect(body).not.toContain('exception when')
  })

  it('atomically replaces registration intents and exposes that RPC only to the service role', () => {
    const sql = compact(migrationSql())
    const body = compact(functionBody(migrationSql(), 'replace_registration_intent'))
    expect(sql).toMatch(/create or replace function public\.replace_registration_intent\b[\s\S]*?security definer[\s\S]*?set search_path = ''/)
    expect(body).toContain('update public.registration_intents')
    expect(body).toContain("set status = 'cancelled'")
    expect(body).toContain('insert into public.registration_intents')
    expect(body.indexOf('update public.registration_intents')).toBeLessThan(body.indexOf('insert into public.registration_intents'))
    expect(body).not.toContain('exception when')
    expect(sql).toMatch(/revoke all on function public\.replace_registration_intent\([^)]*\) from public, anon, authenticated/)
    expect(sql).toMatch(/grant execute on function public\.replace_registration_intent\([^)]*\) to service_role/)
  })

  it('backfills every published non-empty legacy email and phone without an arbitrary timestamp cutoff', () => {
    const sql = compact(migrationSql())
    const backfillStatements = sql.match(/update public\.profiles set [^;]+;/g) ?? []
    const emailBackfill = backfillStatements.find((statement) => statement.includes('public_email_visible'))
    const phoneBackfill = backfillStatements.find((statement) => statement.includes('phone_visible'))
    expect(emailBackfill).toContain("public_email_visible = case when pg_catalog.btrim(profiles.email) <> '' then true else profiles.public_email_visible end")
    expect(emailBackfill).toContain("profiles.status = 'published'")
    expect(phoneBackfill).toContain("phone_visible = case when pg_catalog.btrim(profiles.phone) <> '' then true else profiles.phone_visible end")
    expect(phoneBackfill).toContain("profiles.status = 'published'")
    expect(emailBackfill).not.toContain('profiles.created_at')
    expect(emailBackfill).not.toContain('profiles.updated_at')
    expect(sql).not.toMatch(/set (whatsapp_visible|location_visible) = true/)
  })

  it('claims a persistent one-time marker before applying the visibility backfill', () => {
    const sql = compact(migrationSql())
    const markerClaim = sql.indexOf('insert into public.data_backfill_markers')
    const markerGuard = sql.indexOf('if v_marker_claimed = 1 then')
    const emailBackfill = sql.indexOf('public_email_visible = case')
    const phoneBackfill = sql.indexOf('phone_visible = case')
    expect(sql).toContain('create table if not exists public.data_backfill_markers')
    expect(sql).toContain("'202609060002_legacy_contact_visibility'")
    expect(sql).toContain('on conflict (name) do nothing')
    expect(sql).toContain('get diagnostics v_marker_claimed = row_count')
    expect(markerClaim).toBeGreaterThan(-1)
    expect(markerGuard).toBeGreaterThan(markerClaim)
    expect(emailBackfill).toBeGreaterThan(markerGuard)
    expect(phoneBackfill).toBeGreaterThan(emailBackfill)
  })
})
