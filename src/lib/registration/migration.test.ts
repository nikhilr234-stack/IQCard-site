import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609050002_create_registration_intents.sql')

describe('registration intent migration', () => {
  it('stores only a hashed one-time token and a versioned design payload', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

    expect(sql).toContain('create table public.registration_intents')
    expect(sql).toContain('id uuid primary key default gen_random_uuid()')
    expect(sql).toContain('token_hash text not null unique')
    expect(sql).not.toMatch(/\btoken text\b/)
    expect(sql).toContain('design_payload jsonb not null')
    expect(sql).toContain('schema_version integer not null default 1')
    expect(sql).toContain('first_name text not null')
    expect(sql).toContain('last_name text not null')
  })

  it('constrains lifecycle state and protects the table with RLS', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

    expect(sql).toContain("status in ('pending', 'claimed', 'expired', 'cancelled')")
    expect(sql).toContain('owner_id uuid references public.user_accounts')
    expect(sql).toContain('expires_at timestamptz not null')
    expect(sql).toContain('claimed_at timestamptz')
    expect(sql).toContain('alter table public.registration_intents enable row level security')
    expect(sql).toContain('create index registration_intents_email_idx')
    expect(sql).toContain('create index registration_intents_owner_idx')
    expect(sql).toContain('create index registration_intents_expiry_idx')
  })

  it('is non-destructive to existing checkout handoffs', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

    expect(sql).not.toMatch(/drop\s+table/)
    expect(sql).not.toMatch(/delete\s+from\s+public\.checkout_handoffs/)
  })

  it('claims one intent atomically only for the matching verified email', () => {
    const sql = readFileSync(migrationPath, 'utf8').toLowerCase()

    expect(sql).toContain('create or replace function public.claim_registration_intent')
    expect(sql).toContain('security definer')
    expect(sql).toContain('for update')
    expect(sql).toContain("v_intent.status <> 'pending'")
    expect(sql).toContain('v_intent.expires_at <= now()')
    expect(sql).toContain('v_intent.email <> lower(btrim(p_email))')
    expect(sql).toContain('owner_id = p_owner_id')
    expect(sql).toContain("status = 'claimed'")
    expect(sql).toContain("where registration_intents.token_hash = p_token_hash and registration_intents.status = 'pending'")
    expect(sql).toContain('grant execute on function public.claim_registration_intent')
  })
})
