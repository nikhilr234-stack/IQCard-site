import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { LIVE_WIDGETS, handoffIdentityName, normalizeWidgetOrder } from './dashboard-v6'

describe('dashboard v6', () => {
  it('uses the owner center for every dashboard, regardless of publish status', () => {
    const editor = readFileSync(resolve(process.cwd(), 'src/app/dashboard/profile-editor.tsx'), 'utf8')

    expect(editor).toContain('return <LiveOwnerCenter')
    expect(editor).not.toContain('getDashboardMode')
    expect(editor).not.toContain('function SetupDashboard')
    expect(editor).not.toContain('function LiveDashboard')
  })

  it('normalizes saved widget order without allowing unknown or duplicate widgets', () => {
    expect(normalizeWidgetOrder(['share', 'share', 'not-a-widget', 'identity'])).toEqual([
      'share', 'identity', 'analytics', 'requests', 'content', 'spaces', 'card',
    ])
  })

  it('uses the validated card name to initialize a new owner profile', () => {
    expect(handoffIdentityName({ configuration: { identity: { name: '  Nikhil Rakesh  ' } } })).toBe('Nikhil Rakesh')
    expect(handoffIdentityName({ configuration: { identity: { name: 'YOUR NAME' } } })).toBeNull()
    expect(handoffIdentityName({ configuration: { identity: { name: 'Nikhil' } } })).toBeNull()
    expect(handoffIdentityName({ configuration: { identity: null } })).toBeNull()
  })

  it('does not include a theme module', () => {
    expect(LIVE_WIDGETS).toEqual(['identity', 'analytics', 'requests', 'content', 'spaces', 'share', 'card'])
    expect(LIVE_WIDGETS).not.toContain('theme')
  })

  it('loads the claimed checkout design into the owner dashboard', () => {
    const page = readFileSync(resolve(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8')
    const editor = readFileSync(resolve(process.cwd(), 'src/app/dashboard/profile-editor.tsx'), 'utf8')

    expect(page).toContain('getLatestCheckoutHandoff(account.id)')
    expect(page).toContain('getLatestClaimedRegistrationIntent(account.id)')
    expect(page).toContain('getOwnProfilePresentation(account.id)')
    expect(page).not.toContain('redirect(onboardingPath(progress.currentStep))')
    expect(page).toContain('savedDesign={savedDesign}')
    expect(page).toContain('presentation={presentation}')
    expect(editor).toContain('savedDesign: SavedDesign | null')
    expect(editor).toContain('savedDesign={savedDesign}')
    expect(editor).toContain('<LiveOwnerCenter')
  })
})
