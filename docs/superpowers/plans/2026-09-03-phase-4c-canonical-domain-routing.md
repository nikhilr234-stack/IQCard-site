# Phase 4C Canonical Domain Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** Make the root domain the canonical IQ Card landing page, preserve `/iq` links with a redirect, and show `iqcard.in` consistently in the editor.

**Architecture:** Keep the existing Next.js root landing page and dynamic `/{slug}` profile route. Add a permanent Next.js redirect for the legacy `/iq` landing URL, reserve `iq` so it cannot become a client profile slug, and replace stale `iqcard.me` copy in the editor.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-03-phase-4c-canonical-domain-routing-design.md`

## Global Constraints

- `https://iqcard.in/` is the canonical landing page.
- `https://iqcard.in/{slug}` remains the public individual profile format.
- `/iq` permanently redirects to `/`.
- The `iq` profile slug is reserved.
- Existing profile slugs are not renamed automatically.
- Existing Resend DNS records remain untouched.

---

### Task 1: Reserve the legacy `iq` slug

**Files:**
- Modify: `src/lib/profile/validation.ts`
- Test: `src/lib/profile/validation.test.ts`

**Interfaces:**
- Existing `isReservedSlug(slug: string): boolean` and `validateSlug(slug: string): string | null` remain the public interfaces.

- [ ] **Step 1: Write the failing test**

Add this assertion to the existing profile slug tests:

```ts
it('reserves the legacy iq landing slug', () => {
  expect(validateSlug('iq')).toBe('That profile URL is reserved.')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/lib/profile/validation.test.ts`

Expected: FAIL because `iq` is not yet in the reserved set.

- [ ] **Step 3: Add `iq` to the reserved slug set**

Change the set in `src/lib/profile/validation.ts` to include `iq`:

```ts
const reserved = new Set(['admin', 'api', 'auth', 'dashboard', 'login', 'iq'])
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/lib/profile/validation.test.ts`

Expected: PASS.

### Task 2: Add the canonical `/iq` redirect

**Files:**
- Create: `src/lib/site-routing.ts`
- Modify: `next.config.ts`
- Test: `src/lib/site-routing.test.ts`

**Interfaces:**
- Produce `legacyRouteRedirects`, an array of Next.js redirect definitions.
- `next.config.ts` consumes `legacyRouteRedirects` from `./src/lib/site-routing` in its `redirects()` function.

- [ ] **Step 1: Write the failing test**

Create `src/lib/site-routing.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { legacyRouteRedirects } from './site-routing'

describe('canonical site routing', () => {
  it('redirects the legacy landing URL to the root landing page', () => {
    expect(legacyRouteRedirects).toContainEqual({ source: '/iq', destination: '/', permanent: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node node_modules/vitest/vitest.mjs run src/lib/site-routing.test.ts`

Expected: FAIL because `src/lib/site-routing.ts` does not exist.

- [ ] **Step 3: Implement the redirect and connect it to Next.js**

Create `src/lib/site-routing.ts`:

```ts
export const legacyRouteRedirects = [
  { source: '/iq', destination: '/', permanent: true },
]
```

Update `next.config.ts`:

```ts
import { legacyRouteRedirects } from './src/lib/site-routing'

const nextConfig: NextConfig = {
  // existing options stay unchanged
  async redirects() {
    return legacyRouteRedirects
  },
}
```

Preserve the existing security headers while adding the `redirects()` property.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node node_modules/vitest/vitest.mjs run src/lib/site-routing.test.ts`

Expected: PASS.

### Task 3: Update the displayed public domain

**Files:**
- Modify: `src/app/dashboard/profile-editor.tsx`

**Interfaces:**
- No component or action interfaces change.

- [ ] **Step 1: Replace stale domain copy**

Replace every user-facing `iqcard.me` string in the editor with `iqcard.in`, including the URL prefix and published-card message. Keep the actual `/${profile.slug}` links unchanged.

- [ ] **Step 2: Check for stale public-domain copy**

Run: `rg -n "iqcard\\.me" src README.md supabase`

Expected: no matches.

### Task 4: Verify the full application

**Files:**
- No additional files.

- [ ] **Step 1: Run the complete test suite**

Run: `node node_modules/vitest/vitest.mjs run`

Expected: all tests pass, including the new slug and routing tests.

- [ ] **Step 2: Run TypeScript and lint checks**

Run:

```bash
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js src
```

Expected: both commands pass with no errors.

- [ ] **Step 3: Run the production build**

Run: `node node_modules/next/dist/bin/next build`

Expected: the build completes successfully and includes the redirect configuration.

- [ ] **Step 4: Check local route behavior**

With the dev server running, open `/`, `/iq`, and `/nikhil`.

Expected:

- `/` shows the landing page.
- `/iq` redirects to `/`.
- `/nikhil` continues to resolve the published profile route.

