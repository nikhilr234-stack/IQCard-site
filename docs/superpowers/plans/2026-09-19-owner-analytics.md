# Owner Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build privacy-safe owner analytics for public profile views, NFC card taps, contact saves, link clicks, and a seven-day dashboard trend.

**Architecture:** Public interactions send minimal analytics events to a server route, which records only validated, deduplicated event facts through service-managed Supabase RPCs. An opaque, per-design NFC token is resolved by a redirect route that logs a card tap. The authenticated dashboard queries an owner-scoped, zero-filled seven-day summary.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL, Vitest, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-19-owner-analytics-design.md`

## Global Constraints

- Never store visitor names, emails, IP addresses, user agents, or cross-site browsing history.
- Browser event deduplication is once per profile, event type, optional link, anonymous browser hash, and UTC day.
- NFC card taps are not deduplicated; every valid physical tap counts.
- Public-profile navigation must fail open when analytics is unavailable.
- Only server-side code may write or aggregate analytics; no direct client table access.
- `/t/[token]` must not reveal draft, unpublished, revoked, or unknown profiles.
- Dashboard data is owner-scoped and always contains seven UTC days, including zeros.

## Review Focus

- Malformed or cross-profile `link_click` requests must be ignored without preventing the outbound link from opening (Task 3).
- Repeated refreshes from one browser must not inflate daily profile-view totals (Task 2).
- A token for a draft, unpublished, revoked, or unknown card must return 404 without redirecting or logging an event (Task 4).
- The NFC URL must remain deterministic for the same profile/design but unguessable without `IQCARD_ANALYTICS_SECRET` (Task 4).
- A no-activity owner must see seven zero-filled days and all four totals at zero, not an empty or misleading chart (Task 5).

---

## File Structure

- `supabase/migrations/202609190001_create_profile_analytics.sql` — analytics tables, strict RLS, indexes, write and read RPCs.
- `src/lib/analytics/types.ts` — event, daily series, and dashboard-summary types.
- `src/lib/analytics/validation.ts` — public event validation and anonymous-key hashing helpers.
- `src/lib/analytics/repository.ts` — server-only event writes, token resolution, token URL generation, and owner summary reads.
- `src/app/api/analytics/event/route.ts` — public, fail-safe browser event intake route.
- `src/app/t/[token]/route.ts` — NFC tap event and safe redirect route.
- `src/components/profile-analytics.tsx` — client tracker, tracked contact-save link, and tracked external-link component.
- `src/components/public-profile.tsx`, `src/components/cover-profile.tsx`, `src/components/public-profile-card.tsx` — instrument published-profile actions.
- `src/lib/analytics/dashboard.ts` — display-safe zero-filled trend mapping.
- `src/app/dashboard/page.tsx`, `src/app/dashboard/profile-editor.tsx`, `src/app/dashboard/live-owner-center.tsx` — owner analytics data and UI.

### Task 1: Establish analytics types, validation, and environment boundary

**Files:**
- Create: `src/lib/analytics/types.ts`
- Create: `src/lib/analytics/validation.ts`
- Create: `src/lib/analytics/validation.test.ts`
- Modify: `src/lib/env.ts`
- Modify: `src/lib/env.test.ts`

**Interfaces:**
- Produces `AnalyticsEventType`, `BrowserAnalyticsEvent`, `AnalyticsSummary`, `validateBrowserAnalyticsEvent`, `createDailyVisitorHash`, and `getAnalyticsSecret`.
- Consumed by Tasks 2–6.

- [ ] **Step 1: Write the failing tests**

```ts
expect(validateBrowserAnalyticsEvent({ profileSlug: 'ava-stone', eventType: 'profile_view' })).toEqual({
  profileSlug: 'ava-stone', eventType: 'profile_view', linkId: null,
})
expect(validateBrowserAnalyticsEvent({ profileSlug: 'ava-stone', eventType: 'link_click', linkId: 'not-a-uuid' })).toBeNull()
expect(createDailyVisitorHash('browser-token', 'secret', '2026-09-19')).toMatch(/^[a-f0-9]{64}$/)
expect(() => getAnalyticsSecret({ IQCARD_ANALYTICS_SECRET: '' })).toThrow('IQCARD_ANALYTICS_SECRET')
```

- [ ] **Step 2: Run the failing test**

Run: `node_modules/.bin/vitest run src/lib/analytics/validation.test.ts`

Expected: FAIL because analytics modules and `getAnalyticsSecret` do not exist.

- [ ] **Step 3: Implement the minimal types and validator**

```ts
export type AnalyticsEventType = 'profile_view' | 'contact_save' | 'link_click'
export type BrowserAnalyticsEvent = { profileSlug: string; eventType: AnalyticsEventType; linkId: string | null }

export function validateBrowserAnalyticsEvent(value: unknown): BrowserAnalyticsEvent | null { /* allow bounded slugs, the three event types, and UUID link ids only for link_click */ }
export function createDailyVisitorHash(token: string, secret: string, day: string): string { /* sha256(`${secret}:${day}:${token}`) */ }
```

Add `getAnalyticsSecret` beside `getServiceRoleKey`, using the existing `required` helper.

- [ ] **Step 4: Run the targeted tests**

Run: `node_modules/.bin/vitest run src/lib/analytics/validation.test.ts src/lib/env.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics src/lib/env.ts src/lib/env.test.ts
git commit -m "feat: add analytics validation boundary"
```

### Task 2: Add locked-down analytics storage and RPC contracts

**Files:**
- Create: `supabase/migrations/202609190001_create_profile_analytics.sql`
- Create: `src/lib/database/profile-analytics-migration.test.ts`

**Interfaces:**
- Produces RPCs `record_public_profile_event`, `record_card_tap`, `resolve_card_tap_token`, and `get_own_profile_analytics`.
- Consumed by Tasks 3–6.

- [ ] **Step 1: Write migration contract tests**

```ts
expect(sql).toContain('create table public.profile_analytics_events')
expect(sql).toContain("check (event_type in ('profile_view', 'card_tap', 'contact_save', 'link_click'))")
expect(sql).toContain('enable row level security')
expect(sql).toContain('revoke all on function public.record_public_profile_event')
expect(sql).toContain('profile_analytics_events_daily_visitor_unique')
expect(sql).toContain('generate_series')
```

- [ ] **Step 2: Run the migration contract test**

Run: `node_modules/.bin/vitest run src/lib/database/profile-analytics-migration.test.ts`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Implement the migration**

Create two RLS-enabled tables:

```sql
create table public.profile_analytics_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('profile_view','card_tap','contact_save','link_click')),
  profile_link_id uuid references public.profile_links(id) on delete set null,
  visitor_hash text check (visitor_hash is null or visitor_hash ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz not null default now(),
  occurred_day date not null default current_date,
  check ((event_type = 'link_click') = (profile_link_id is not null)),
  check ((event_type = 'card_tap') = (visitor_hash is null))
);
create unique index profile_analytics_events_daily_visitor_unique
  on public.profile_analytics_events(profile_id,event_type,coalesce(profile_link_id,'00000000-0000-0000-0000-000000000000'::uuid),visitor_hash,occurred_day)
  where visitor_hash is not null;
```

Create `profile_tap_tokens` with unique `token_hash`, `profile_id`, `design_id`, `active`, and lifecycle timestamps. Implement service-role-only RPCs which verify a published profile and, for link clicks, that the link belongs to it. `get_own_profile_analytics(p_owner_id, p_start_day)` must use `generate_series` to return all days and restrict by the owner id passed from trusted server code.

- [ ] **Step 4: Run migration contract tests**

Run: `node_modules/.bin/vitest run src/lib/database/profile-analytics-migration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/202609190001_create_profile_analytics.sql src/lib/database/profile-analytics-migration.test.ts
git commit -m "feat: add secure profile analytics storage"
```

### Task 3: Build the public event intake route

**Files:**
- Create: `src/lib/analytics/repository.ts`
- Create: `src/lib/analytics/repository.test.ts`
- Create: `src/app/api/analytics/event/route.ts`
- Create: `src/app/api/analytics/event/route.test.ts`

**Interfaces:**
- Consumes `BrowserAnalyticsEvent`, `validateBrowserAnalyticsEvent`, `createDailyVisitorHash`, and `record_public_profile_event`.
- Produces `POST /api/analytics/event`, accepting `{ profileSlug, eventType, linkId? }` and returning `204` for accepted, malformed, or duplicate browser events.
- Consumed by Task 6.

- [ ] **Step 1: Write failing repository and route tests**

```ts
await expect(recordBrowserEvent({ profileSlug: 'ava-stone', eventType: 'profile_view', linkId: null }, dependencies)).resolves.toEqual('recorded')
await expect(POST(new Request('https://iqcard.in/api/analytics/event', { method: 'POST', body: JSON.stringify({ profileSlug: 'bad!', eventType: 'profile_view' }) }))).resolves.toMatchObject({ status: 204 })
```

Mock the repository dependency and assert malformed payloads never call Supabase; valid link clicks call the RPC with a 64-character daily visitor hash.

- [ ] **Step 2: Run failing tests**

Run: `node_modules/.bin/vitest run src/lib/analytics/repository.test.ts src/app/api/analytics/event/route.test.ts`

Expected: FAIL because no repository or route exists.

- [ ] **Step 3: Implement safe event recording**

```ts
export async function recordBrowserEvent(event: BrowserAnalyticsEvent, visitorToken: string, now = new Date()) {
  const visitorHash = createDailyVisitorHash(visitorToken, getAnalyticsSecret(), now.toISOString().slice(0, 10))
  await createAdminClient().rpc('record_public_profile_event', {
    p_slug: event.profileSlug, p_event_type: event.eventType, p_link_id: event.linkId, p_visitor_hash: visitorHash,
  })
}
```

The route must read the JSON defensively, create a first-party `iq_analytics_visitor` HTTP-only cookie when absent, call the repository only for valid input, and always return `204` without exposing database failures.

- [ ] **Step 4: Run targeted tests**

Run: `node_modules/.bin/vitest run src/lib/analytics/repository.test.ts src/app/api/analytics/event/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics src/app/api/analytics/event
git commit -m "feat: record privacy-safe public analytics events"
```

### Task 4: Create and resolve NFC card tap URLs

**Files:**
- Modify: `src/lib/analytics/repository.ts`
- Create: `src/app/t/[token]/route.ts`
- Create: `src/app/t/[token]/route.test.ts`
- Modify: `src/lib/env.ts`
- Modify: `src/lib/env.test.ts`

**Interfaces:**
- Produces `tapTokenFor(profileId, designId)`, `getTapUrl(siteUrl, profileId, designId)`, and `GET /t/[token]`.
- Consumed by Task 5.

- [ ] **Step 1: Write failing token and redirect tests**

```ts
expect(tapTokenFor('profile-id', 'IQD-1234', 'secret')).toEqual(tapTokenFor('profile-id', 'IQD-1234', 'secret'))
expect(tapTokenFor('profile-id', 'IQD-1234', 'secret')).not.toEqual(tapTokenFor('profile-id', 'IQD-1234', 'other-secret'))
await expect(GET(new Request('https://iqcard.in/t/token'), { params: Promise.resolve({ token: 'token' }) })).resolves.toMatchObject({ status: 307 })
```

Cover draft, unpublished, revoked, and unknown lookup results with 404 assertions and assert none call the tap-recording RPC.

- [ ] **Step 2: Run failing tests**

Run: `node_modules/.bin/vitest run src/app/t/'[token]'/route.test.ts src/lib/analytics/repository.test.ts`

Expected: FAIL because token and route code does not exist.

- [ ] **Step 3: Implement deterministic opaque tokens and redirect**

Use `createHmac('sha256', getAnalyticsSecret()).update(`${profileId}:${designId}`).digest('base64url')` for a stable opaque token. Store its SHA-256 hash with `ensure_card_tap_token`, never the raw value. `/t/[token]` validates the token format, calls `resolve_card_tap_token`, records the tap only after a published target is returned, then issues `NextResponse.redirect(new URL(`/${slug}`, request.url), 307)`.

- [ ] **Step 4: Run targeted tests**

Run: `node_modules/.bin/vitest run src/app/t/'[token]'/route.test.ts src/lib/analytics/repository.test.ts src/lib/env.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics src/lib/env.ts src/lib/env.test.ts src/app/t
git commit -m "feat: add secure NFC tap redirects"
```

### Task 5: Add owner aggregation and dashboard analytics UI

**Files:**
- Create: `src/lib/analytics/dashboard.ts`
- Create: `src/lib/analytics/dashboard.test.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/profile-editor.tsx`
- Modify: `src/app/dashboard/live-owner-center.tsx`
- Modify: `src/app/dashboard/live-owner-center.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes `get_own_profile_analytics`, `getTapUrl`, `AnalyticsSummary`.
- Produces `getOwnerAnalytics(ownerId, now)` and a `LiveOwnerCenter` analytics prop with four totals, seven daily points, and an NFC tap URL.
- Consumed by no later task.

- [ ] **Step 1: Write failing summary and UI tests**

```ts
expect(normalizeAnalyticsDays([], new Date('2026-09-19T12:00:00Z'))).toEqual([
  { day: '2026-09-13', profileViews: 0, cardTaps: 0, contactSaves: 0, linkClicks: 0 },
  { day: '2026-09-14', profileViews: 0, cardTaps: 0, contactSaves: 0, linkClicks: 0 },
  { day: '2026-09-15', profileViews: 0, cardTaps: 0, contactSaves: 0, linkClicks: 0 },
  { day: '2026-09-16', profileViews: 0, cardTaps: 0, contactSaves: 0, linkClicks: 0 },
  { day: '2026-09-17', profileViews: 0, cardTaps: 0, contactSaves: 0, linkClicks: 0 },
  { day: '2026-09-18', profileViews: 0, cardTaps: 0, contactSaves: 0, linkClicks: 0 },
  { day: '2026-09-19', profileViews: 0, cardTaps: 0, contactSaves: 0, linkClicks: 0 },
])
expect(rendered).toContain('Profile views')
expect(rendered).toContain('NFC tap URL')
```

Add a non-zero fixture proving totals and the plotted daily values derive from repository output, not samples.

- [ ] **Step 2: Run failing tests**

Run: `node_modules/.bin/vitest run src/lib/analytics/dashboard.test.ts src/app/dashboard/live-owner-center.test.ts`

Expected: FAIL because the summary and UI do not exist.

- [ ] **Step 3: Implement aggregation and display**

`getOwnerAnalytics` calls the new RPC for the seven-day window and uses `normalizeAnalyticsDays` to zero-fill missing UTC days. Pass the result from `DashboardPage` through `ProfileEditor` into `LiveOwnerCenter`. Replace the analytics placeholder with four labeled totals, a compact accessible SVG trend, and “No analytics yet” only when every total is zero. In Card Atelier, display a copyable `getTapUrl(...)` value with copy feedback and plain wording that the URL must be written to the NFC chip.

- [ ] **Step 4: Run targeted tests**

Run: `node_modules/.bin/vitest run src/lib/analytics/dashboard.test.ts src/app/dashboard/live-owner-center.test.ts src/app/dashboard/linkedin-feedback.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analytics/dashboard.ts src/lib/analytics/dashboard.test.ts src/app/dashboard src/app/globals.css
git commit -m "feat: show real owner analytics dashboard"
```

### Task 6: Instrument public profiles without blocking visitors

**Files:**
- Create: `src/components/profile-analytics.tsx`
- Create: `src/components/profile-analytics.test.tsx`
- Modify: `src/components/public-profile.tsx`
- Modify: `src/components/cover-profile.tsx`
- Modify: `src/components/public-profile-card.tsx`
- Modify: `src/components/cover-profile.test.tsx`
- Modify: `src/components/public-profile-card.test.tsx`

**Interfaces:**
- Consumes `POST /api/analytics/event` and a published profile `slug` plus profile-link ids.
- Produces `ProfileViewTracker`, `TrackedContactSave`, and `TrackedExternalLink`.

- [ ] **Step 1: Write failing instrumentation tests**

```tsx
render(<ProfileViewTracker slug="ava-stone" />)
expect(fetch).toHaveBeenCalledWith('/api/analytics/event', expect.objectContaining({ method: 'POST', keepalive: true }))

fireEvent.click(screen.getByRole('link', { name: 'Save Contact' }))
expect(navigator.sendBeacon).toHaveBeenCalledWith('/api/analytics/event', expect.any(Blob))

fireEvent.click(screen.getByRole('link', { name: 'Portfolio' }))
expect(navigator.sendBeacon).toHaveBeenCalled()
```

Also test missing `sendBeacon` uses `fetch(..., { keepalive: true })`, and a rejected analytics request leaves the original contact/link `href` untouched.

- [ ] **Step 2: Run failing tests**

Run: `node_modules/.bin/vitest run src/components/profile-analytics.test.tsx src/components/cover-profile.test.tsx src/components/public-profile-card.test.tsx`

Expected: FAIL because the tracking components do not exist.

- [ ] **Step 3: Implement tracker components and wire both profile templates**

`ProfileViewTracker` is a client component that sends one `profile_view` after `document.visibilityState === 'visible'`. `TrackedContactSave` and `TrackedExternalLink` attempt `navigator.sendBeacon` first and otherwise use a fire-and-forget keepalive POST; neither calls `preventDefault`. Pass `profile.slug` and each existing `profile_links.id` from server components so a link click is validated against the published profile by Task 2's RPC.

- [ ] **Step 4: Run targeted tests**

Run: `node_modules/.bin/vitest run src/components/profile-analytics.test.tsx src/components/cover-profile.test.tsx src/components/public-profile-card.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/profile-analytics.tsx src/components/profile-analytics.test.tsx src/components/public-profile.tsx src/components/cover-profile.tsx src/components/public-profile-card.tsx src/components/cover-profile.test.tsx src/components/public-profile-card.test.tsx
git commit -m "feat: track public profile activity"
```

### Task 7: End-to-end verification, migration application, and production readiness

**Files:**
- Modify: `.env.example` if present; otherwise create `docs/analytics-operations.md`
- Modify: `docs/superpowers/specs/2026-09-19-owner-analytics-design.md` only if implementation uncovers an approved design correction.

**Interfaces:**
- Consumes all prior task interfaces.
- Produces a verified production-ready deployment checklist.

- [ ] **Step 1: Add a focused operations checklist**

Document the exact required Vercel/Supabase configuration:

```text
IQCARD_ANALYTICS_SECRET=<at least 32 random bytes, base64 or hex>
Apply supabase/migrations/202609190001_create_profile_analytics.sql before deployment.
Write each displayed /t/<token> URL to the corresponding card NFC chip.
```

- [ ] **Step 2: Run the full automated suite**

Run: `node_modules/.bin/vitest run && node_modules/.bin/eslint src && node_modules/.bin/next build`

Expected: all tests, lint, and production build PASS.

- [ ] **Step 3: Perform browser verification against a non-production environment**

Verify, without sending real contact information: one public view, one public link click, one contact-save request, one `/t/<token>` redirect, and owner dashboard totals/trend. Confirm public navigation still succeeds when the analytics endpoint returns an error.

- [ ] **Step 4: Apply the migration and configure the secret**

Use the existing Supabase/Vercel deployment workflow. Confirm the migration is applied before the production code is deployed; set `IQCARD_ANALYTICS_SECRET` in Vercel for Production, Preview, and Development as appropriate.

- [ ] **Step 5: Commit and request final review**

```bash
git add docs/analytics-operations.md
git commit -m "docs: add analytics operations checklist"
```

Request a whole-branch review before deploying.

## Self-Review

- Spec coverage: Tasks 1–2 cover privacy, storage, validation, and access boundaries; Tasks 3–4 cover browser events and NFC redirects; Task 5 covers seven-day totals/trend and the NFC URL; Task 6 covers all public-profile interaction sources; Task 7 covers deployment, migration, and browser verification.
- Placeholder scan: No open-ended implementation placeholders remain; every task specifies exact files, interfaces, tests, commands, and commit content.
- Type consistency: `AnalyticsEventType`, `BrowserAnalyticsEvent`, `AnalyticsSummary`, `getOwnerAnalytics`, `getTapUrl`, and the four RPC names are defined before their consumers.
- Review focus: Each listed failure mode maps to Tasks 2–5 and has an explicit test requirement.
