import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('live owner center', () => {
  it('uses real owner data and explicit empty states instead of prototype data', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/app/dashboard/live-owner-center.tsx'), 'utf8')
    expect(source).toContain('Good morning')
    expect(source).toContain('profile.slug')
    expect(source).toContain('profile.profile_links')
    expect(source).toContain('SavedCardRenderer')
    expect(source).toContain('No analytics yet')
    expect(source).toContain('Spaces are coming soon')
    expect(source).not.toContain('Priya Sharma')
    expect(source).not.toContain('2,847')
  })

  it('uses the configured site URL for display, copy, and share', () => {
    const ownerCenter = readFileSync(resolve(process.cwd(), 'src/app/dashboard/live-owner-center.tsx'), 'utf8')
    const editor = readFileSync(resolve(process.cwd(), 'src/app/dashboard/profile-editor.tsx'), 'utf8')
    const page = readFileSync(resolve(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8')

    expect(ownerCenter).toContain('publicProfileUrl(siteUrl, profile.slug)')
    expect(editor).toContain('publicProfileUrl(siteUrl')
    expect(page).toContain('siteUrl={getPublicEnv().siteUrl}')
    expect(`${ownerCenter}\n${editor}`).not.toContain('https://iqcard.in')
  })
})
