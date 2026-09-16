import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const page = readFileSync(resolve(process.cwd(), 'src/app/[slug]/page.tsx'), 'utf8')

describe('public profile page caching', () => {
  it('uses a short revalidation window instead of forcing every request dynamic', () => {
    expect(page).toContain('export const revalidate = 60')
    expect(page).not.toContain("dynamic = 'force-dynamic'")
  })
})
