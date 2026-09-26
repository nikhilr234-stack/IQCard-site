import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260926165635_create_gift_profile_transaction.sql')

function sql() {
  return readFileSync(migrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

describe('gift factory transaction migration', () => {
  it('uses the existing claim and profile schema with one service-only atomic creation function', () => {
    const migration = sql()

    expect(migration).toContain('create or replace function public.admin_create_and_publish_gift_profile')
    expect(migration).toContain('security definer')
    expect(migration).toContain('insert into public.profiles')
    expect(migration).toContain('owner_id')
    expect(migration).toContain('insert into public.profile_gift_claims')
    expect(migration).toContain('insert into public.profile_presentations')
    expect(migration).toContain('insert into public.profile_links')
    expect(migration).toContain("'cover'")
    expect(migration).toContain("status = 'published'")
    expect(migration).toContain('revoke all on function public.admin_create_and_publish_gift_profile')
    expect(migration).toContain('grant execute on function public.admin_create_and_publish_gift_profile')
    expect(migration).not.toMatch(/create\s+(table|schema)\b/)
  })

  it('installs its own shared link validator without relying on historical publication migrations', () => {
    const migration = sql()

    expect(migration).toContain('create or replace function public.decode_profile_link_percent')
    expect(migration).toContain('create or replace function public.is_valid_profile_link(p_label text, p_url text)')
    expect(migration).toContain('revoke all on function public.is_valid_profile_link(text, text)')
    expect(migration).not.toContain('enforce_published_profile_validity')
  })

  it('rejects invalid links inside the create RPC before publishing without a trigger', () => {
    const migration = sql()
    const functionBody = migration.slice(migration.indexOf('create or replace function public.admin_create_and_publish_gift_profile'))
    const validationIndex = functionBody.indexOf('not public.is_valid_profile_link(v_link.value ->> \'label\', v_link.value ->> \'url\')')
    const publishIndex = functionBody.indexOf("update public.profiles set status = 'published'")

    expect(validationIndex).toBeGreaterThanOrEqual(0)
    expect(functionBody.indexOf("raise sqlstate '22023' using message = 'gift links are invalid'", validationIndex)).toBeGreaterThan(validationIndex)
    expect(publishIndex).toBeGreaterThan(validationIndex)
    expect(functionBody).not.toContain('publication trigger')
  })

  it('does not expose the recipient email through the public profile or add an onboarding row', () => {
    const migration = sql()
    const functionStart = migration.indexOf('create or replace function public.admin_create_and_publish_gift_profile')

    expect(functionStart).toBeGreaterThanOrEqual(0)
    const body = migration.slice(functionStart)
    expect(body).toContain('recipient_email')
    expect(body).not.toContain('insert into public.onboarding_progress')
  })

  it('allocates a collision-safe slug and publishes only after every gift row is written', () => {
    const migration = sql()
    const functionBody = migration.slice(migration.indexOf('create or replace function public.admin_create_and_publish_gift_profile'))
    const publishIndex = functionBody.lastIndexOf("update public.profiles set status = 'published'")

    expect(functionBody).toContain('pg_advisory_xact_lock')
    expect(functionBody).toContain('for v_attempt in 1..100 loop')
    expect(functionBody).toContain("v_slug_root := pg_catalog.btrim(pg_catalog.regexp_replace(pg_catalog.lower(v_full_name), '[^a-z0-9]+', '-', 'g'), '-')")
    expect(functionBody).toContain("if v_slug_root in ('admin','api','auth','dashboard','login','iq','register','onboarding','customize','claim-gift')")
    expect(publishIndex).toBeGreaterThan(functionBody.indexOf('insert into public.profile_gift_claims'))
    expect(publishIndex).toBeGreaterThan(functionBody.indexOf('insert into public.profile_presentations'))
    expect(publishIndex).toBeGreaterThan(functionBody.indexOf('insert into public.profile_links'))
  })

  it('creates gifts unowned with a private claim and a published Cover presentation using Cover defaults', () => {
    const functionBody = sql().slice(sql().indexOf('create or replace function public.admin_create_and_publish_gift_profile'))
    const profileInsert = functionBody.slice(functionBody.indexOf('insert into public.profiles'), functionBody.indexOf('insert into public.profile_gift_claims'))

    expect(profileInsert).toContain('p_profile_id, null, v_slug, \'draft\'')
    expect(functionBody).toContain('insert into public.profile_gift_claims (profile_id, recipient_email, recipient_name)')
    expect(functionBody).toContain("'template', 'cover'")
    expect(functionBody).toContain("'overlay', 0.38")
    expect(functionBody).toContain("'focaly', 50")
    expect(functionBody).toContain("'alignment', 'center'")
    expect(functionBody).toContain("'photopathoverride', p_photo_path")
    expect(functionBody).toContain('insert into public.profile_links (profile_id, label, url, sort_order)')
  })

  it('accepts only generated profile-scoped gift media paths', () => {
    const migration = sql()

    expect(migration).toContain("p_photo_path not like 'gift/' || p_profile_id::text || '/%'")
    expect(migration).toContain("p_cover_path not like 'gift/' || p_profile_id::text || '/%'")
  })

  it('generates route-safe slugs and avoids reserved names and collisions', () => {
    const functionBody = sql().slice(sql().indexOf('create or replace function public.admin_create_and_publish_gift_profile'))

    expect(functionBody).toContain("'[^a-z0-9]+', '-', 'g'")
    expect(functionBody).toContain("v_slug_root := v_slug_root || '-gift'")
    expect(functionBody).toContain("v_slug := case when v_attempt = 1 then v_slug_root else v_slug_root || '-' || v_attempt::text end")
    expect(functionBody).toContain("v_constraint is distinct from 'profiles_slug_key'")
    expect(functionBody).toContain("raise sqlstate '23505' using message = 'unable to allocate a unique gift url'")
  })
})
