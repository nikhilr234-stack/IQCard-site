# Admin Workspace Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the protected IQ Card admin area into a full-viewport, spacious, genuinely interactive client workspace with usable analytical filtering and real admin destinations.

**Architecture:** Keep the server-owned `Client[]` dataset and existing authenticated server actions as the source of truth. Add a small, pure dashboard-view layer that translates every analytical interaction into a filtered client directory, while keeping search, status, sort, pagination, and export composable. Add protected destination routes that reuse the admin shell/navigation rather than inventing a second visual system.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Vitest, existing Supabase server actions and repository.

**Spec:** `docs/superpowers/specs/2026-09-17-admin-workspace-interactions-design.md`

## Global Constraints

- Preserve the existing Minimal and Cover profile/editor behavior; this work is limited to the admin workspace.
- `/admin` remains protected by `requireAdminAccount()` and must use the real repository-backed `Client[]` plus existing server actions.
- Keep client data separate from dashboard presentation/selection state; no mock-client state or local mutation source of truth.
- Keep the approved IQ Card language: warm white canvas, editorial black type, thin neutral borders, restrained status color, and deliberate negative space.
- At normal desktop widths (1440–1800px), show eight KPIs as 4 × 2 and analytics as 2 × 2; only widen toward 8/4 at >=1900px.
- Preserve responsive desktop, tablet, and mobile behavior; never reintroduce the global landing-page content-width constraint inside admin.
- Use keyboard-accessible buttons/links, visible focus states, reduced-motion-safe scrolling, and no unlabelled interactive controls.
- Verify with `npm test -- --run`, `npm run build`, and browser checks at 1600px, 1200px, 900px, and 390px.

---

## File structure

- Modify `src/features/admin/types.ts`: define dashboard interaction view types and dates/status values without weakening the existing `Client` contract.
- Modify `src/features/admin/selectors.ts`: pure active-view/date-range selection helpers, preserving existing filtering, sort, pagination, KPI, chart, and CSV helpers.
- Modify `src/features/admin/selectors.test.ts`: deterministic selector tests for every analytical view and date range.
- Modify `src/features/admin/AdminDashboard.tsx`: own view state, keyboard search focus, scroll-to-directory behavior, and server-action notices.
- Modify `src/features/admin/AdminDashboard.test.tsx`: exercise active-view clearing, keyboard search, and injected action behavior.
- Modify `src/features/admin/components/{AdminShell,AdminSidebar,AdminTopbar,InsightRail,KpiStrip,OnboardingChart,StatusDonut,OnboardingFunnel,CompletionDistribution,ClientTable}.tsx`: make visible controls accessible and connect them to dashboard callbacks or real routes.
- Modify `src/features/admin/admin.css`: introduce full-bleed layout and the specified responsive grid breakpoints without affecting non-admin pages.
- Create `src/features/admin/AdminWorkspacePage.tsx`: a shared protected-route shell for secondary admin destinations, with route-specific headings and concise real-data summaries.
- Create `src/app/admin/{analytics,templates,branding,settings,notifications}/page.tsx`: protected, server-rendered admin destinations using `requireAdminAccount()` and real repository data where applicable.
- Modify `src/app/admin/page.tsx` and `src/app/admin/page.test.tsx`: preserve dashboard adapters and test that `/admin` stays protected and data-backed.

### Task 1: Model interactive dashboard views in pure selectors

**Files:**
- Modify: `src/features/admin/types.ts`
- Modify: `src/features/admin/selectors.ts`
- Test: `src/features/admin/selectors.test.ts`

**Interfaces:**
- Consumes: existing `Client`, `ClientStatus`, `ClientFilters`, and `ClientSort` contracts.
- Produces: `DashboardView`, `DashboardDateRange`, `applyDashboardView(clients, view, now?)`, and `filterClientsByDateRange(clients, days, now?)` for the dashboard and all analytics components.

- [ ] **Step 1: Write the failing selector tests**

```ts
import { applyDashboardView, filterClientsByDateRange } from './selectors'

it('applies status, funnel, completion, joined-date, segment, and follow-up views without mutating clients', () => {
  expect(applyDashboardView(clients, { kind: 'status', label: 'Live profiles', status: 'Live' }).map(({ id }) => id)).toEqual(['live'])
  expect(applyDashboardView(clients, { kind: 'funnel', label: 'Opened invites', stage: 'opened' }).map(({ id }) => id)).toEqual(['live', 'draft'])
  expect(applyDashboardView(clients, { kind: 'completionRange', label: '0–20%', min: 0, max: 20 }).map(({ id }) => id)).toEqual(['invited', 'none'])
  expect(applyDashboardView(clients, { kind: 'segment', label: 'Startup', segment: 'Startup' }).map(({ id }) => id)).toEqual(['draft', 'invited'])
  expect(clients.map(({ id }) => id)).toEqual(['live', 'draft', 'invited', 'none'])
})

it('uses the supplied clock for synchronized 7/14/30/90-day windows', () => {
  expect(filterClientsByDateRange(clients, 7, new Date('2026-09-10T00:00:00Z')).map(({ id }) => id)).toEqual(['none'])
})
```

- [ ] **Step 2: Run the selector test to verify it fails**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/selectors.test.ts`

Expected: FAIL because `applyDashboardView` and `filterClientsByDateRange` are not exported.

- [ ] **Step 3: Add discriminated view types and pure selection helpers**

```ts
export type DashboardView =
  | { kind: 'status'; label: string; status: ClientStatus }
  | { kind: 'inviteOpened'; label: string }
  | { kind: 'weeklyActive'; label: string }
  | { kind: 'completionRange'; label: string; min: number; max: number }
  | { kind: 'joinedDate'; label: string; date: string }
  | { kind: 'joinedRecent'; label: string; days: DashboardDateRange }
  | { kind: 'funnel'; label: string; stage: 'invited' | 'opened' | 'started' | 'completed' | 'published' | 'live' }
  | { kind: 'client'; label: string; id: string }
  | { kind: 'segment'; label: string; segment: string }
  | { kind: 'followUp'; label: string }

export function applyDashboardView(clients: readonly Client[], view: DashboardView | null, now = new Date()): Client[] {
  if (!view) return [...clients]
  if (view.kind === 'status') return clients.filter((client) => client.status === view.status)
  if (view.kind === 'completionRange') return clients.filter((client) => client.completion >= view.min && client.completion <= view.max)
  if (view.kind === 'client') return clients.filter((client) => client.id === view.id)
  if (view.kind === 'segment') return clients.filter((client) => client.segment === view.segment)
  const latestActivity = Math.max(...clients.map((client) => new Date(client.lastActiveAt ?? client.joinedAt).getTime()), now.getTime() - 365 * 86_400_000)
  if (view.kind === 'inviteOpened') return clients.filter((client) => client.inviteOpened)
  if (view.kind === 'weeklyActive') return clients.filter((client) => client.lastActiveAt && new Date(client.lastActiveAt).getTime() >= latestActivity - 7 * 86_400_000)
  if (view.kind === 'joinedDate') return clients.filter((client) => client.joinedAt.slice(0, 10) === view.date)
  if (view.kind === 'joinedRecent') return clients.filter((client) => new Date(client.joinedAt).getTime() >= latestActivity - view.days * 86_400_000)
  if (view.kind === 'followUp') return clients.filter((client) => client.status === 'Invited' && (!client.lastActiveAt || new Date(client.lastActiveAt).getTime() < latestActivity - 2 * 86_400_000))
  if (view.kind === 'funnel' && view.stage === 'opened') return clients.filter((client) => client.inviteOpened)
  if (view.kind === 'funnel' && view.stage === 'started') return clients.filter((client) => client.startedProfile)
  if (view.kind === 'funnel' && view.stage === 'completed') return clients.filter((client) => client.completedProfile)
  if (view.kind === 'funnel' && view.stage === 'published') return clients.filter((client) => client.status === 'Live' || client.completedProfile)
  if (view.kind === 'funnel' && view.stage === 'live') return clients.filter((client) => client.status === 'Live')
  return [...clients]
}
```

- [ ] **Step 4: Run the selector tests to verify they pass**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/selectors.test.ts`

Expected: PASS, including the existing KPI/CSV tests and the new deterministic active-view/date-range tests.

- [ ] **Step 5: Commit the pure interaction model**

```bash
git add src/features/admin/types.ts src/features/admin/selectors.ts src/features/admin/selectors.test.ts
git commit -m "feat: add admin dashboard view selectors"
```

### Task 2: Wire dashboard interactions to the canonical directory

**Files:**
- Modify: `src/features/admin/AdminDashboard.tsx`
- Modify: `src/features/admin/AdminDashboard.test.tsx`
- Modify: `src/features/admin/components/{KpiStrip,OnboardingChart,StatusDonut,OnboardingFunnel,CompletionDistribution,InsightRail}.tsx`

**Interfaces:**
- Consumes: `DashboardView`, `applyDashboardView`, `filterClientsByDateRange`, and the existing `AdminDashboardActions` server-action boundary.
- Produces: typed `onSelect(view: DashboardView)`, `onClearActiveView()`, and `onDateRangeChange(days: DashboardDateRange)` props for presentation components.

- [ ] **Step 1: Write failing dashboard interaction tests**

```tsx
it('filters the directory from a KPI and clears the active view', async () => {
  await act(async () => button(host, /live profiles/i).click())
  expect(host.textContent).toContain('Active view: Live profiles')
  expect(host.textContent).toContain('Ada Lovelace')
  await act(async () => button(host, /^clear$/i).click())
  expect(host.textContent).not.toContain('Active view: Live profiles')
})

it('focuses global search from Command-K and Control-K', async () => {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
  expect(document.activeElement).toBe(host.querySelector('[aria-label="Search clients"]'))
})
```

- [ ] **Step 2: Run the dashboard test to verify it fails**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx`

Expected: FAIL because KPI cards are not buttons and there is no active-view bar or search shortcut handler.

- [ ] **Step 3: Add one composable dashboard selection pipeline**

```tsx
const [activeView, setActiveView] = useState<DashboardView | null>(null)
const searchRef = useRef<HTMLInputElement>(null)
const directoryClients = useMemo(
  () => applyDashboardView(filterClientsByDateRange(clients, dateRangeDays), activeView),
  [clients, dateRangeDays, activeView],
)

function selectView(view: DashboardView) {
  setActiveView(view)
  setQuery('')
  setStatus('All')
  scrollToDirectory()
}
```

Use this callback for each KPI, line-point, donut slice/list row, funnel stage, completion bucket, quick insight, and recent client. Render one `Active view: {activeView.label}` bar immediately above `ClientTable`, with a button labelled `Clear` that resets only `activeView`.

- [ ] **Step 4: Make chart and rail affordances semantic controls**

```tsx
<button type="button" className="kpi-card" onClick={() => onSelect({ kind: 'status', label: 'Live profiles', status: 'Live' })}>
  <span aria-hidden="true">●</span><strong>{value}</strong><small>Live profiles</small>
</button>
```

For chart points, funnel rows, status rows, completion bars, insight rows, and recent-client rows, use the same `button type="button"` pattern with an explicit accessible label; do not rely on clickable `<div>` elements.

- [ ] **Step 5: Run focused component tests to verify they pass**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx src/features/admin/components/ClientTable.test.tsx`

Expected: PASS, including existing injected server-action and onboarding error tests.

- [ ] **Step 6: Commit the dashboard selection flow**

```bash
git add src/features/admin/AdminDashboard.tsx src/features/admin/AdminDashboard.test.tsx src/features/admin/components
git commit -m "feat: make admin analytics filter clients"
```

### Task 3: Complete real directory controls and top-level affordances

**Files:**
- Modify: `src/features/admin/components/AdminTopbar.tsx`
- Modify: `src/features/admin/components/ClientTable.tsx`
- Modify: `src/features/admin/components/ClientTable.test.tsx`
- Modify: `src/features/admin/AdminDashboard.tsx`

**Interfaces:**
- Consumes: `onQueryChange`, `onStatusChange`, `onDateRangeChange`, `onPublish`, `onUnpublish`, `onResend`, existing `ClientSort`, and `ClientTable` data.
- Produces: functional 7/14/30/90 selectors, notification/account menus, `View` links, `•••` action menus, and existing server-action adapters.

- [ ] **Step 1: Write failing interaction tests for real controls**

```tsx
it('updates the synchronized date range from the topbar control', async () => {
  await act(async () => setValue(host.querySelector('[aria-label="Date range"]')!, '14'))
  expect(host.querySelector('[aria-label="Onboarding time range"]')?.getAttribute('value')).toBe('14')
})

it('opens a row action menu containing View and a server-backed publish action', async () => {
  await act(async () => button(host, /more actions for ada lovelace/i).click())
  expect(host.textContent).toContain('View profile')
  await act(async () => button(host, /publish ada lovelace/i).click())
  expect(actions.onPublish).toHaveBeenCalledWith('draft-1')
})
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx src/features/admin/components/ClientTable.test.tsx`

Expected: FAIL because the topbar lacks 14-day selection and row actions do not expose the requested menu.

- [ ] **Step 3: Implement controls with existing server-action boundaries**

```tsx
const dateRanges = [{ label: 'Last 7 days', days: 7 }, { label: 'Last 14 days', days: 14 }, { label: 'Last 30 days', days: 30 }, { label: 'Last 90 days', days: 90 }] as const

<button type="button" aria-label={`More actions for ${client.name}`} aria-expanded={openMenuId === client.id} onClick={() => setOpenMenuId(openMenuId === client.id ? null : client.id)}>•••</button>
```

Keep `Publish`, `Unpublish`, `Resend`, and segment updates delegated to injected async actions. Make `View profile` a normal link when `profileUrl` exists, and a disabled explanatory control when it does not. Keep export client-side from the currently active, filtered, sorted set. Notification/account controls must reveal labelled menus; their navigation targets are implemented in Task 5.

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx src/features/admin/components/ClientTable.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit directory and topbar controls**

```bash
git add src/features/admin/components/AdminTopbar.tsx src/features/admin/components/ClientTable.tsx src/features/admin/components/ClientTable.test.tsx src/features/admin/AdminDashboard.tsx src/features/admin/AdminDashboard.test.tsx
git commit -m "feat: complete admin workspace controls"
```

### Task 4: Apply the approved spacious, full-viewport layout

**Files:**
- Modify: `src/features/admin/admin.css`
- Modify: `src/features/admin/components/AdminShell.tsx`
- Modify: `src/features/admin/AdminDashboard.test.tsx`

**Interfaces:**
- Consumes: current scoped `.iq-admin-dashboard` namespace and `AdminShell` grid areas.
- Produces: a full-bleed admin shell with normal desktop 4×2/2×2 grids and very-wide 8/4 grids, all scoped to admin.

- [ ] **Step 1: Write the CSS regression test**

```ts
it('keeps the admin shell full-bleed and uses spacious desktop grid breakpoints', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/features/admin/admin.css'), 'utf8')
  expect(css).toContain('width: 100vw')
  expect(css).toContain('margin-left: calc(50% - 50vw)')
  expect(css).toMatch(/\.kpi-strip \{ grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/)
  expect(css).toContain('@media (min-width: 1900px)')
})
```

- [ ] **Step 2: Run the regression test to verify it fails**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx`

Expected: FAIL because the base CSS still uses the original compact desktop grid and no explicit full-bleed shell.

- [ ] **Step 3: Implement the scoped grid and visual spacing changes**

```css
.iq-admin-dashboard .admin-shell {
  width: 100vw;
  min-height: 100vh;
  margin-left: calc(50% - 50vw);
  grid-template-columns: 208px minmax(0, 1fr) 292px;
}
.iq-admin-dashboard .kpi-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.iq-admin-dashboard .analytics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (min-width: 1900px) {
  .iq-admin-dashboard .kpi-strip { grid-template-columns: repeat(8, minmax(0, 1fr)); }
  .iq-admin-dashboard .analytics-grid { grid-template-columns: 1.35fr .95fr 1fr 1fr; }
}
```

Use the supplied spacious archive only as a visual/reference source. Preserve the app's global layout unchanged and make cards/inputs/rows/rail larger only inside `.iq-admin-dashboard`.

- [ ] **Step 4: Run the regression test to verify it passes**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx`

Expected: PASS with the original full-width regression still covered.

- [ ] **Step 5: Commit the responsive layout**

```bash
git add src/features/admin/admin.css src/features/admin/components/AdminShell.tsx src/features/admin/AdminDashboard.test.tsx
git commit -m "feat: expand admin workspace layout"
```

### Task 5: Add protected, real admin destinations and navigation

**Files:**
- Create: `src/features/admin/AdminWorkspacePage.tsx`
- Create: `src/app/admin/analytics/page.tsx`
- Create: `src/app/admin/templates/page.tsx`
- Create: `src/app/admin/branding/page.tsx`
- Create: `src/app/admin/settings/page.tsx`
- Create: `src/app/admin/notifications/page.tsx`
- Modify: `src/features/admin/components/AdminSidebar.tsx`
- Modify: `src/features/admin/components/AdminTopbar.tsx`
- Modify: `src/app/admin/page.test.tsx`

**Interfaces:**
- Consumes: `requireAdminAccount()`, `listAdminClients()`, and `AdminShell`.
- Produces: real href targets for sidebar, notification, and account controls; each secondary route is server-protected and renders a real client-derived summary where appropriate.

- [ ] **Step 1: Write route/guard tests**

```tsx
it('requires an admin account before rendering the analytics destination', async () => {
  await expect(AnalyticsPage()).rejects.toThrow('not authenticated')
})

it('uses real admin route hrefs rather than button-only sidebar items', () => {
  expect(renderedSidebar.querySelector('a[href="/admin/analytics"]')).not.toBeNull()
  expect(renderedSidebar.querySelector('a[href="/admin/templates"]')).not.toBeNull()
})
```

- [ ] **Step 2: Run the route test to verify it fails**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/app/admin/page.test.tsx`

Expected: FAIL because secondary pages do not exist and sidebar entries are non-navigating buttons.

- [ ] **Step 3: Create one authenticated server-page factory and route entries**

```tsx
export async function AdminWorkspacePage({ title, description, section }: { title: string; description: string; section: 'analytics' | 'templates' | 'branding' | 'settings' | 'notifications' }) {
  await requireAdminAccount()
  const clients = await listAdminClients()
  return <AdminShell sidebar={<AdminSidebar activeSection={section} />} topbar={<AdminTopbar routeOnly />} insightRail={<InsightRail clients={clients} insights={getQuickInsights(clients)} />}><AdminWorkspaceSummary title={title} description={description} section={section} clients={clients} /></AdminShell>
}
```

Each route must have concrete content: analytics shows metrics and status totals; templates shows Minimal and `02 Cover` usage counts; branding shows presentation/cover guidance and linked owner editor; notifications shows pending invites and recent joins; settings shows the authenticated admin/operational copy. Do not add mock persistence or a generic SaaS redesign.

- [ ] **Step 4: Convert visible navigation to links and route-safe menus**

```tsx
const items = [
  ['Clients', '/admin', 'clients'],
  ['Analytics', '/admin/analytics', 'analytics'],
  ['Templates', '/admin/templates', 'templates'],
  ['Branding', '/admin/branding', 'branding'],
  ['Settings', '/admin/settings', 'settings'],
] as const
```

Use `<Link>` for internal targets. The notification menu links to `/admin/notifications`; the account menu links to `/dashboard` and `/admin/settings`. Keep menus keyboard-closeable with Escape and click-away handling.

- [ ] **Step 5: Run route tests to verify they pass**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH node_modules/.bin/vitest run src/app/admin/page.test.tsx src/features/admin/AdminDashboard.test.tsx`

Expected: PASS and no unauthenticated secondary admin route can render data.

- [ ] **Step 6: Commit the real admin destinations**

```bash
git add src/features/admin/AdminWorkspacePage.tsx src/features/admin/components/AdminSidebar.tsx src/features/admin/components/AdminTopbar.tsx src/app/admin
git commit -m "feat: add admin workspace destinations"
```

### Task 6: Verify the complete admin workspace and prepare release

**Files:**
- Modify only if verification exposes a scoped defect; otherwise no source changes.

**Interfaces:**
- Consumes: all Tasks 1–5, production-safe server actions, protected routes, and the app's existing test/build commands.
- Produces: evidence that the workspace is functional, responsive, and deployable.

- [ ] **Step 1: Run the full test suite**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm test -- --run`

Expected: PASS with no skipped replacement tests.

- [ ] **Step 2: Run the production build**

Run: `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH npm run build`

Expected: PASS with all `/admin/*` routes compiling.

- [ ] **Step 3: Perform a visual interaction check**

Run: start the local app using the project’s existing dev command, then verify `/admin` in authenticated Chrome at 1600px, 1200px, 900px, and 390px.

Expected: 4×2 KPIs and 2×2 analytics at 1600px; wide expansion only at >=1900px; no clipped or horizontally constrained admin canvas; click/keyboard interactions update the directory and reveal the active-view bar.

- [ ] **Step 4: Commit any verification-only fixes**

```bash
git add src/features/admin/admin.css src/features/admin/AdminDashboard.tsx src/features/admin/components
git commit -m "fix: polish admin workspace verification"
```

- [ ] **Step 5: Review and hand off**

Run: `git status --short && git log --oneline -6`

Expected: no unintended changes. Summarize the exact routes, interactions, test/build evidence, and deployment readiness for the user.
