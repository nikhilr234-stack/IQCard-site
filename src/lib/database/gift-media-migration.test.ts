import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260926170757_gift_media_private_bucket.sql')

describe('private gift media bucket migration', () => {
  it('creates a private, size-limited image bucket without public object access policies', () => {
    const migration = readFileSync(migrationPath, 'utf8').toLowerCase().replace(/\s+/g, ' ')

    expect(migration).toMatch(/values\s*\(\s*'gift-media',\s*'gift-media',\s*false/)
    expect(migration).toContain('5242880')
    expect(migration).toContain('image/jpeg')
    expect(migration).toContain('image/png')
    expect(migration).toContain('image/webp')
    expect(migration).not.toContain('create policy')
    expect(migration).not.toContain('public = true')
  })
})
