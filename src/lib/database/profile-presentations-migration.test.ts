import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609140001_add_profile_presentations.sql')
const publicLookupMigrationPath = resolve(process.cwd(), 'supabase/migrations/202609160001_add_slug_to_published_profile_presentations.sql')
const designPersistenceMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260927120000_preserve_design_in_profile_presentation_rpc.sql')
const templateSettingsMigrationPath = resolve(process.cwd(), 'supabase/migrations/20260927130000_preserve_template_settings_in_profile_presentation_rpc.sql')
const coverBackgroundMigrationPath = resolve(process.cwd(), 'supabase/migrations/20261002190000_enable_cover_backgrounds_for_all_templates.sql')

function sql(): string {
  return readFileSync(migrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

function publicLookupSql(): string {
  return readFileSync(publicLookupMigrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

function designPersistenceSql(): string {
  return readFileSync(designPersistenceMigrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

function templateSettingsPersistenceSql(): string {
  return readFileSync(templateSettingsMigrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

function coverBackgroundPersistenceSql(): string {
  return readFileSync(coverBackgroundMigrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

function functionBody(migration: string, name: string): string {
  const match = migration.match(new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\b[\\s\\S]*?as\\s+\\$\\$([\\s\\S]*?)\\$\\$`,
  ))
  expect(match, `missing ${name} function`).not.toBeNull()
  return match?.[1] ?? ''
}

describe('profile presentations migration', () => {
  it('keeps drafts private behind an owner-only RLS policy', () => {
    const migration = sql()

    expect(migration).toContain('create table if not exists public.profile_presentations')
    expect(migration).toContain('profile_id uuid primary key references public.profiles(id) on delete cascade')
    expect(migration).toContain("draft jsonb not null default '{\"template\":\"minimal\",\"cover\":{}}'::jsonb")
    expect(migration).toContain("published jsonb not null default '{\"template\":\"minimal\",\"cover\":{}}'::jsonb")
    expect(migration).toContain('alter table public.profile_presentations enable row level security')
    expect(migration).toContain('create policy "owners read their own profile presentation"')
    expect(migration).toContain('profiles.owner_id = auth.uid()')
    expect(migration).toContain('revoke all privileges on table public.profile_presentations from public, anon, authenticated')
    expect(migration).toContain('grant select on table public.profile_presentations to authenticated')
  })

  it('limits public presentation reads to the published JSON of published profiles', () => {
    const migration = sql()

    expect(migration).toContain('create or replace view public.published_profile_presentations')
    expect(migration).toContain('select profile_presentations.profile_id, profile_presentations.published')
    expect(migration).toContain("where profiles.status = 'published'")
    expect(migration).toContain('grant select on table public.published_profile_presentations to anon, authenticated')
  })

  it('adds the public slug to the published presentation view for concurrent lookup', () => {
    const migration = publicLookupSql()

    expect(migration).toContain('create or replace view public.published_profile_presentations')
    expect(migration).toContain('profiles.slug')
    expect(migration).toContain("where profiles.status = 'published'")
  })

  it('validates and canonicalizes an authenticated owner draft without arbitrary fields', () => {
    const migration = sql()
    const save = functionBody(migration, 'save_own_profile_presentation')

    expect(migration).toMatch(/create or replace function public\.save_own_profile_presentation\b[\s\S]*?security definer[\s\S]*?set search_path = ''/)
    expect(save).toContain('auth.uid()')
    expect(save).toContain("raise sqlstate '42501' using message = 'authentication required'")
    expect(save).toContain('from public.profiles')
    expect(save).toContain('profiles.owner_id = v_owner_id')
    expect(save).toContain('for update')
    expect(save).toContain("p_draft ->> 'template'")
    expect(save).toContain("'{cover,coverpath}'")
    expect(save).toContain("v_owner_id::text || '/%'")
    expect(save).toContain('insert into public.profile_presentations (profile_id, draft)')
    expect(save).toContain('on conflict (profile_id) do update')
    expect(save).toContain('v_canonical_draft := pg_catalog.jsonb_build_object')
    expect(save).toContain("'template', p_draft -> 'template'")
    expect(save).toContain("'coverpath', p_draft #> '{cover,coverpath}'")
    expect(save).toContain("'photopathoverride', p_draft #> '{cover,photopathoverride}'")
    expect(save).toContain('values (v_profile_id, v_canonical_draft)')
    expect(save).not.toContain('values (v_profile_id, p_draft)')
    expect(migration).toContain('revoke all on function public.save_own_profile_presentation(jsonb) from public, anon, service_role')
    expect(migration).toContain('grant execute on function public.save_own_profile_presentation(jsonb) to authenticated')
  })

  it('copies the owner draft to published through a separately authorized promotion RPC', () => {
    const migration = sql()
    const publish = functionBody(migration, 'publish_own_profile_presentation')

    expect(migration).toMatch(/create or replace function public\.publish_own_profile_presentation\b[\s\S]*?security definer[\s\S]*?set search_path = ''/)
    expect(publish).toContain('auth.uid()')
    expect(publish).toContain('profiles.owner_id = v_owner_id')
    expect(publish).toContain('for update')
    expect(publish).toContain('insert into public.profile_presentations (profile_id)')
    expect(publish).toContain('set published = draft')
    expect(migration).toContain('revoke all on function public.publish_own_profile_presentation() from public, anon, service_role')
    expect(migration).toContain('grant execute on function public.publish_own_profile_presentation() to authenticated')
  })

  it('publishes Cover media only when the exact path is in a published Cover snapshot', () => {
    const migration = sql()
    const media = functionBody(migration, 'is_published_profile_cover')

    expect(migration).toContain("values ('profile-covers', 'profile-covers', false)")
    expect(migration).toContain('create policy "owners upload their own profile cover"')
    expect(migration).toContain('create policy "owners update their own profile cover"')
    expect(migration).toContain('create policy "owners delete their own profile cover"')
    expect(migration).toContain('create policy "owners read their own profile cover"')
    expect(media).toContain("profiles.status = 'published'")
    expect(media).toContain("profile_presentations.published ->> 'template' = 'cover'")
    expect(media).toContain("profile_presentations.published #>> '{cover,coverpath}' = p_path")
    expect(migration).toContain('public.is_published_profile_cover(storage.objects.name)')
    expect(migration).toContain('revoke all on function public.is_published_profile_cover(text) from public, anon, authenticated, service_role')
    expect(migration).toContain('grant execute on function public.is_published_profile_cover(text) to anon, authenticated')
  })
})

describe('additive presentation design persistence migration', () => {
  it('keeps legacy template-and-cover drafts valid without adding a design key', () => {
    const migration = designPersistenceSql()
    const save = functionBody(migration, 'save_own_profile_presentation')

    expect(save).toContain("if p_draft ? 'design' then")
    expect(save).toContain("v_canonical_draft := v_canonical_draft || pg_catalog.jsonb_build_object('design', p_draft -> 'design')")
    expect(save).toMatch(/if\s+p_draft\s*\?\s*'design'\s+then[\s\S]*?end if;/)
    expect(migration.match(/create or replace function/g)).toHaveLength(1)
  })

  it('preserves supplied design unchanged in the canonical saved draft', () => {
    const save = functionBody(designPersistenceSql(), 'save_own_profile_presentation')

    expect(save).toContain("'design', p_draft -> 'design'")
    expect(save).toContain('values (v_profile_id, v_canonical_draft)')
    expect(save).not.toContain('values (v_profile_id, p_draft)')
  })

  it('rejects a supplied non-object design and bounds serialized design size', () => {
    const save = functionBody(designPersistenceSql(), 'save_own_profile_presentation')

    expect(save).toContain("p_draft ? 'design'")
    expect(save).toContain("pg_catalog.jsonb_typeof(p_draft -> 'design') is distinct from 'object'")
    expect(save).toContain("pg_catalog.octet_length((p_draft -> 'design')::text) > 16384")
    expect(save).toContain("raise sqlstate '22023' using message = 'invalid presentation settings'")
  })

  it('retains authentication, ownership, media-path, template, and cover validation', () => {
    const migration = designPersistenceSql()
    const save = functionBody(migration, 'save_own_profile_presentation')

    expect(migration).toMatch(/create or replace function public\.save_own_profile_presentation\(p_draft jsonb\)[\s\S]*?security definer[\s\S]*?set search_path = ''/)
    expect(save).toContain('v_owner_id uuid := auth.uid()')
    expect(save).toContain("coalesce(p_draft ->> 'template', '') not in ('minimal', 'cover', 'studio', 'executive', 'signal', 'index')")
    expect(save).toContain("p_draft #>> '{cover,coverpath}'")
    expect(save).toContain("v_owner_id::text || '/%'")
    expect(save).toContain('profiles.owner_id = v_owner_id')
    expect(save).toContain('for update')
    expect(save).toContain("raise sqlstate '42501' using message = 'authentication required'")
  })

  it('leaves publish RPC untouched so publishing copies the saved draft verbatim', () => {
    const migration = designPersistenceSql()
    const originalPublish = functionBody(sql(), 'publish_own_profile_presentation')

    expect(migration).not.toContain('publish_own_profile_presentation')
    expect(originalPublish).toContain('set published = draft')
  })

  it('does not add schema, policy, or ownership changes', () => {
    const migration = designPersistenceSql()

    expect(migration).not.toMatch(/\b(create|alter|drop)\s+table\b/)
    expect(migration).not.toMatch(/\b(create|alter|drop)\s+policy\b/)
    expect(migration).not.toMatch(/\bowner\s+to\b/)
    expect(migration.match(/create or replace function/g)).toEqual(['create or replace function'])
  })
})

describe('additive template settings persistence migration', () => {
  it('preserves optional templateSettings while legacy payloads remain valid', () => {
    const save = functionBody(templateSettingsPersistenceSql(), 'save_own_profile_presentation')
    expect(save).toContain("if p_draft ? 'templatesettings' then")
    expect(save).toContain("'templatesettings', p_draft -> 'templatesettings'")
    expect(save).not.toMatch(/jsonb_build_object\(\s*'templatesettings',\s*'\{\}'/)
  })

  it('rejects non-object and oversized templateSettings in the save RPC', () => {
    const save = functionBody(templateSettingsPersistenceSql(), 'save_own_profile_presentation')
    expect(save).toContain("p_draft ? 'templatesettings'")
    expect(save).toContain("pg_catalog.jsonb_typeof(p_draft -> 'templatesettings') is distinct from 'object'")
    expect(save).toContain("pg_catalog.octet_length((p_draft -> 'templatesettings')::text) > 16384")
    expect(save).toContain("raise sqlstate '22023' using message = 'invalid presentation settings'")
  })

  it('retains existing auth, media, and ownership checks and leaves publish RPC untouched', () => {
    const migration = templateSettingsPersistenceSql()
    const save = functionBody(migration, 'save_own_profile_presentation')
    expect(save).toContain('v_owner_id uuid := auth.uid()')
    expect(save).toContain("v_owner_id::text || '/%'")
    expect(save).toContain('profiles.owner_id = v_owner_id')
    expect(save).toContain('for update')
    expect(migration).not.toContain('publish_own_profile_presentation')
    expect(migration).not.toMatch(/\b(create|alter|drop)\s+table\b/)
    expect(migration).not.toMatch(/\b(create|alter|drop)\s+policy\b/)
    expect(migration.match(/create or replace function/g)).toEqual(['create or replace function'])
  })
})

describe('shared Cover background persistence migration', () => {
  it('stores a validated background choice while defaulting legacy Cover profiles on', () => {
    const migration = coverBackgroundPersistenceSql()
    const save = functionBody(migration, 'save_own_profile_presentation')

    expect(save).toContain("p_draft #> '{cover,backgroundenabled}'")
    expect(save).toContain("pg_catalog.jsonb_typeof(p_draft #> '{cover,backgroundenabled}')")
    expect(save).toContain("'backgroundenabled'")
    expect(save).toContain("(p_draft ->> 'template') = 'cover'")
    expect(save).toContain('v_owner_id::text || \'/%\'')
    expect(migration).toContain('grant execute on function public.save_own_profile_presentation(jsonb) to authenticated')
  })

  it('lets the exact published cover image load for opted-in templates and legacy Cover profiles', () => {
    const migration = coverBackgroundPersistenceSql()
    const media = functionBody(migration, 'is_published_profile_cover')

    expect(media).toContain("profiles.status = 'published'")
    expect(media).toContain("profile_presentations.published #>> '{cover,coverpath}' = p_path")
    expect(media).toContain("profile_presentations.published #>> '{cover,backgroundenabled}' = 'true'")
    expect(media).toContain("profile_presentations.published #> '{cover,backgroundenabled}' is null")
    expect(media).toContain("profile_presentations.published ->> 'template' = 'cover'")
    expect(migration).toContain('revoke all on function public.is_published_profile_cover(text) from public, anon, authenticated, service_role')
    expect(migration).toContain('grant execute on function public.is_published_profile_cover(text) to anon, authenticated')
  })
})
