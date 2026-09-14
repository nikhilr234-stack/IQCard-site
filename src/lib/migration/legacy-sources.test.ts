import { describe, expect, it } from 'vitest'
import { buildMigrationRecords, discoverLegacySources } from './legacy-sources'

describe('legacy source discovery', () => {
  it('ignores the archived duplicate directory', () => {
    const sources = discoverLegacySources(process.cwd())
    expect(sources.every((source) => !source.vcardPath?.includes('/IQCard-site-git/'))).toBe(true)
  })

  it('marks Ashwin and Nikki as missing-email while preserving their slugs', () => {
    const sources = discoverLegacySources(process.cwd())
    const records = buildMigrationRecords(sources)
    const ashwin = records.find((record) => record.sourceSlug === 'ashwin')
    const nikki = records.find((record) => record.sourceSlug === 'nikki')

    expect(ashwin).toMatchObject({ state: 'missing-email', draft: { slug: 'ashwin', fullName: 'Ashwin Reddy' } })
    expect(nikki).toMatchObject({ state: 'missing-email', draft: { slug: 'nikki', fullName: 'Nikki' } })
  })

  it('discovers the thirteen email-bearing canonical sources', () => {
    const records = buildMigrationRecords(discoverLegacySources(process.cwd()))
    expect(records.filter((record) => record.draft.email)).toHaveLength(13)
    expect(records.map((record) => record.sourceSlug)).not.toContain('iq')
    expect(records.map((record) => record.sourceSlug)).not.toContain('social')
  })
})
