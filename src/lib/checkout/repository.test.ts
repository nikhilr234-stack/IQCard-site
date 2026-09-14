import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/202609050001_create_checkout_handoffs.sql')
const repositoryPath = resolve(process.cwd(), 'src/lib/checkout/repository.ts')

describe('checkout handoff persistence', () => {
  it('defines an expiring server-side handoff table with a single-use claim state', () => {
    const source = readFileSync(migrationPath, 'utf8')
    expect(source).toContain('create table public.checkout_handoffs')
    expect(source).toContain('token uuid primary key')
    expect(source).toContain('expires_at')
    expect(source).toContain('claimed_at')
    expect(source).toContain('alter table public.checkout_handoffs enable row level security')
  })

  it('claims only unexpired, unclaimed handoffs for the signed-in owner', () => {
    const source = readFileSync(repositoryPath, 'utf8')
    expect(source).toContain(".is('claimed_at', null)")
    expect(source).toContain(".gt('expires_at', new Date().toISOString())")
    expect(source).toContain('owner_id: ownerId')
    expect(source).toContain('const claimedAt = new Date().toISOString()')
  })
})
