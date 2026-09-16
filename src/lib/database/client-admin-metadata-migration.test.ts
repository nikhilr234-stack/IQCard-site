import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/202609150003_add_client_admin_metadata.sql',
)

function sql(): string {
  return readFileSync(migrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ').trim()
}

describe('client admin metadata migration', () => {
  it('creates service-managed metadata for every client account', () => {
    const migration = sql()

    expect(migration).toContain('create table if not exists public.client_admin_metadata')
    expect(migration).toContain('owner_id uuid primary key references public.user_accounts(id) on delete cascade')
    expect(migration).toContain("segment text not null default 'unassigned'")
    expect(migration).toContain('invite_sent_at timestamptz')
    expect(migration).toContain('invite_opened_at timestamptz')
    expect(migration).toContain('last_active_at timestamptz')
    expect(migration).toContain('created_at timestamptz not null default now()')
    expect(migration).toContain('updated_at timestamptz not null default now()')
    expect(migration).toContain('insert into public.client_admin_metadata (owner_id) select id from public.user_accounts where role = \'client\' on conflict (owner_id) do nothing')
  })

  it('keeps browser roles out while allowing the database service role', () => {
    const migration = sql()

    expect(migration).toContain('alter table public.client_admin_metadata enable row level security')
    expect(migration).toContain('revoke all privileges on table public.client_admin_metadata from public, anon, authenticated')
    expect(migration).toContain('grant all privileges on table public.client_admin_metadata to service_role')
  })

  it('maintains updated_at with the shared timestamp trigger', () => {
    const migration = sql()

    expect(migration).toContain('drop trigger if exists on_client_admin_metadata_updated on public.client_admin_metadata')
    expect(migration).toContain('create trigger on_client_admin_metadata_updated before update on public.client_admin_metadata')
    expect(migration.indexOf('drop trigger if exists on_client_admin_metadata_updated on public.client_admin_metadata')).toBeLessThan(
      migration.indexOf('create trigger on_client_admin_metadata_updated before update on public.client_admin_metadata'),
    )
    expect(migration).toContain('for each row execute procedure public.set_updated_at()')
  })
})
