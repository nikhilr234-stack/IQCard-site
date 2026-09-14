import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609140001_add_profile_presentations.sql')

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

describe('profile presentations migration', () => {
  it('keeps drafts private behind an owner-only RLS policy', () => {
    const migration = sql()

    expect(migration).toContain('create table public.profile_presentations')
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

    expect(migration).toContain('create view public.published_profile_presentations')
    expect(migration).toContain('select profile_presentations.profile_id, profile_presentations.published')
    expect(migration).toContain("where profiles.status = 'published'")
    expect(migration).toContain('grant select on table public.published_profile_presentations to anon, authenticated')
  })

  it('validates and saves only the authenticated owner draft through a narrow RPC', () => {
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
  })
})
