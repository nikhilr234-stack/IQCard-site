import { describe, expect, it } from 'vitest'
import { parseMigrationArgs } from './cli'

describe('legacy migration CLI arguments', () => {
  it('defaults to a dry run', () => {
    expect(parseMigrationArgs([])).toEqual({ mode: 'dry-run', slugs: [], json: false })
  })

  it('parses import, slug, and JSON flags', () => {
    expect(parseMigrationArgs(['--import', '--slug', 'teju', '--json'])).toEqual({ mode: 'import', slugs: ['teju'], json: true })
  })
})
