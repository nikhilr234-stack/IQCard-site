# Physical Card Customizer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish the approved Physical Atelier customizer at `/customize` and make the landing-page purchase CTA open it without authentication.

**Architecture:** Keep the supplied Atelier HTML/inline runtime as the visual source for this first publishable slice, serve it from the Next.js `public` directory, and use a Next rewrite so the public URL remains `/customize`. The existing app remains responsible for the landing page and later checkout/account phases; this slice only establishes the guest design entry point.

**Tech Stack:** Next.js 16 App Router, TypeScript, Vitest, static HTML/CSS/JavaScript, browser `localStorage`.

**Spec:** `docs/superpowers/specs/2026-09-04-physical-card-customizer-integration-design.md`

## Global Constraints

- Do not require login or email before `/customize`.
- The initial card identity must be `YOUR NAME`.
- Keep the supplied Atelier visual behavior intact.
- Label pricing as provisional until server-side pricing exists.
- Do not create payment, shipping, account or URL-claiming behavior in this slice.
- Run tests, TypeScript, lint, production build and a browser/HTTP smoke check before claiming completion.

### Task 1: Add regression tests for the guest customizer entry point

**Files:**
- Create: `src/lib/customizer/customizer-entry.test.ts`
- Modify: `src/lib/landing/homepage-content.ts:1`

**Interfaces:**
- Consumes: `HOME_CTA_HREF` and the published Atelier file at `public/customize/index.html`.
- Produces: regression coverage proving the CTA points to `/customize` and the customizer starts with `YOUR NAME` and no login copy.

- [ ] **Step 1: Write the failing tests**

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { HOME_CTA_HREF } from '@/lib/landing/homepage-content'

const atelierPath = resolve(process.cwd(), 'public/customize/index.html')

describe('physical customizer entry point', () => {
  it('sends the landing CTA to the guest customizer', () => {
    expect(HOME_CTA_HREF).toBe('/customize')
  })

  it('starts with a placeholder identity and no authentication gate', () => {
    const html = readFileSync(atelierPath, 'utf8')
    expect(html).toContain("name: 'YOUR NAME'")
    expect(html).toContain('id="frontName">YOUR NAME</div>')
    expect(html).not.toMatch(/sign in|log in|password/i)
  })

  it('offers the new checkout handoff label', () => {
    const html = readFileSync(atelierPath, 'utf8')
    expect(html).toContain('>Continue →</button>')
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm test --run src/lib/customizer/customizer-entry.test.ts`

Expected: FAIL because the CTA still points to `/login` and the supplied file is not yet under `public/customize/`.

### Task 2: Publish the Atelier static runtime through the production app

**Files:**
- Create: `public/customize/index.html` (copied from `/Users/soumyar/Downloads/iqcard-physical-atelier-v8.html`)
- Modify: `public/customize/index.html` at the initial identity and checkout labels
- Modify: `next.config.ts:5-16`
- Modify: `src/lib/landing/homepage-content.ts:1`

**Interfaces:**
- Consumes: the supplied Atelier HTML and existing landing-page CTA constant.
- Produces: `/customize` serving the Atelier document with no auth redirect; `/customize/index.html` remains a direct static fallback.

- [ ] **Step 1: Copy the approved Atelier file into the app's public directory**

Run: `mkdir -p public/customize && cp /Users/soumyar/Downloads/iqcard-physical-atelier-v8.html public/customize/index.html`

Expected: `public/customize/index.html` exists and is byte-for-byte equal to the supplied source before the intentional copy edits.

- [ ] **Step 2: Update the guest defaults and handoff label**

Change the initial configuration and preview fallbacks to `YOUR NAME`, and change the commercial action label from `Continue to checkout` to `Continue →`. Do not alter the pricing table, validation contract or prototype payload behavior.

- [ ] **Step 3: Point the landing CTA at `/customize`**

Set:

```ts
export const HOME_CTA_HREF = '/customize'
```

- [ ] **Step 4: Keep the clean `/customize` URL with a Next rewrite**

Add this rewrite while preserving the existing redirects and security headers:

```ts
async rewrites() {
  return [
    { source: '/customize', destination: '/customize/index.html' },
    { source: '/customize/', destination: '/customize/index.html' },
  ]
}
```

- [ ] **Step 5: Run the focused test to verify it passes**

Run: `pnpm test --run src/lib/customizer/customizer-entry.test.ts`

Expected: PASS.

### Task 3: Verify the published route and existing application

**Files:**
- Modify: none

**Interfaces:**
- Consumes: `/`, `/customize`, `/customize/index.html`, and the existing test/build tooling.
- Produces: verified production-ready build artifact and smoke-test evidence.

- [ ] **Step 1: Run the full automated checks**

Run: `pnpm test --run && pnpm exec tsc --noEmit && pnpm lint && pnpm build`

Expected: all tests pass, TypeScript exits 0, ESLint exits 0 and Next.js build completes successfully with the customizer route present.

- [ ] **Step 2: Start the production server for a local smoke test**

Run: `pnpm start`

Expected: Next.js listens on the configured local port without startup errors.

- [ ] **Step 3: Check the landing CTA and customizer response**

Run: `curl -I http://localhost:3000/` and `curl -sS http://localhost:3000/customize | rg -n "Design an|YOUR NAME|Continue →"`

Expected: the landing page responds successfully and the `/customize` response contains the Atelier title/copy, `YOUR NAME`, and the new Continue label; no login page is returned.

- [ ] **Step 4: Deploy to Vercel and verify the live route**

Deploy the current project using the already-linked `iqcard-app` Vercel project, then check `https://iqcard.in/customize` for HTTP success and the same identifying markup. Do not test payment or send email in this slice.

- [ ] **Step 5: Report the boundary clearly**

Tell the user that the Atelier is live and guest-accessible, while checkout, payment, shipping, account ownership and IQ URL claiming remain the next implementation phases.
