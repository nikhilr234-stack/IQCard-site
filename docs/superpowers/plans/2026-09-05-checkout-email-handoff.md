# Checkout Email Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the customizer's Confirm build action into a reliable email handoff that stores the guest card design server-side and opens the signed-in owner's dashboard after the magic link is clicked.

**Architecture:** The guest customizer posts a validated design payload and email to a Next.js Route Handler. The handler creates an expiring Supabase handoff row with a cryptographically random token and sends a Supabase magic link whose redirect carries only that token and the requested dashboard path. The confirmation route verifies the link, claims the handoff for the authenticated user, and the dashboard loads the claimed design from Supabase instead of relying on browser localStorage.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript, Supabase Auth, Supabase Postgres, Vitest, plain HTML/JavaScript customizer.

**Spec:** User-approved flow in the conversation: “Confirm build → enter email → send magic link → click email link → open dashboard with the saved card,” with server-side persistence for cross-browser recovery.

## Global Constraints

- Do not require payment or profile setup before saving the card design.
- Do not expose the Supabase service-role key to the browser.
- Keep the existing direct-token-hash magic-link flow; do not reintroduce six-digit codes or browser-bound PKCE confirmation.
- Preserve the existing customizer options and dashboard/profile functionality.
- Handoff tokens expire and are single-use for claiming.

---

### Task 1: Define and test handoff data contracts

**Files:**
- Create: `src/lib/checkout/handoff.ts`
- Test: `src/lib/checkout/handoff.test.ts`

**Interfaces:**
- `normalizeHandoffEmail(email: string): string | null`
- `createHandoffToken(): string`
- `safeHandoffPayload(value: unknown): { designId: string; payload: Record<string, unknown> } | null`

- [ ] **Step 1: Write failing tests** for trimmed lowercase email validation, token entropy/format, and rejecting malformed payloads.
- [ ] **Step 2: Run `pnpm exec vitest run src/lib/checkout/handoff.test.ts` and verify the tests fail because the module does not exist.
- [ ] **Step 3: Implement the minimal pure helpers** with a UUID token, normalized email, and bounded JSON payload validation.
- [ ] **Step 4: Run the focused tests and verify they pass.

### Task 2: Add server-side handoff storage

**Files:**
- Create: `supabase/migrations/202609050001_create_checkout_handoffs.sql`
- Create: `src/lib/checkout/repository.ts`
- Test: `src/lib/checkout/repository.test.ts`

**Interfaces:**
- `createCheckoutHandoff(input): Promise<{ token: string }>`
- `claimCheckoutHandoff(token: string, ownerId: string): Promise<CheckoutHandoff | null>`
- `getLatestCheckoutHandoff(ownerId: string): Promise<CheckoutHandoff | null>`

- [ ] **Step 1: Write failing repository/source-contract tests** for the table columns, expiry check, single-use claim, and owner-scoped dashboard lookup.
- [ ] **Step 2: Run the focused tests and verify the expected failures.
- [ ] **Step 3: Add the `checkout_handoffs` table** with token primary key, email, design ID, JSON payload, optional owner ID, timestamps, expiry, claimed timestamp, indexes, and RLS disabled for server-role-only access.
- [ ] **Step 4: Implement repository functions with the service-role client**, ensuring claim updates only unclaimed, unexpired rows and returns the claimed record.
- [ ] **Step 5: Run focused repository tests and then the full unit suite.

### Task 3: Wire Confirm build to email handoff

**Files:**
- Create: `src/app/api/checkout/handoff/route.ts`
- Modify: `public/customize/index.html`
- Modify: `src/lib/customizer/customizer-entry.test.ts`

**Interfaces:**
- `POST /api/checkout/handoff` accepts `{ email, payload }` and returns `{ ok: true, sent: true }` or a safe error response.

- [ ] **Step 1: Add failing source tests** requiring an email field, a POST to `/api/checkout/handoff`, a “Check your email” state, and removal of the local-only second-click redirect.
- [ ] **Step 2: Run the customizer tests and verify they fail.
- [ ] **Step 3: Implement the route handler** to validate email/payload, create a handoff, call `signInWithOtp` with `/auth/confirm?handoff=<token>&next=/dashboard?setup=1`, and return non-sensitive errors.
- [ ] **Step 4: Replace the prototype two-click Confirm build behavior** with a single email capture panel. Preserve the local autosave as a fallback, but make the server handoff the primary path.
- [ ] **Step 5: Run focused customizer/API tests and full unit tests.

### Task 4: Claim the handoff during magic-link confirmation

**Files:**
- Modify: `src/app/auth/confirm/route.ts`
- Modify: `src/app/auth/callback/route.ts`
- Create or modify: `src/lib/auth/handoff-claim.ts`
- Test: `src/lib/auth/handoff-claim.test.ts`

**Interfaces:**
- `claimHandoffAfterAuth(token: string | null, accountId: string): Promise<void>`

- [ ] **Step 1: Write failing tests** for extracting the handoff query parameter, claiming after successful OTP/code exchange, ignoring missing/expired tokens, and preserving `next`.
- [ ] **Step 2: Run the focused tests and verify failure.
- [ ] **Step 3: Implement the claim helper and call it only after a valid Supabase session/account exists.
- [ ] **Step 4: Keep invalid-link behavior unchanged and ensure the handoff token is never echoed into error HTML.
- [ ] **Step 5: Run auth tests and the full suite.

### Task 5: Load the saved card design in the dashboard

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/profile-editor.tsx`
- Modify: `src/lib/dashboard/dashboard-v6.ts`
- Test: `src/lib/dashboard/dashboard-v6.test.ts`

**Interfaces:**
- Dashboard receives `savedDesign: CheckoutHandoff | null` and renders the design ID/material/name when present.

- [ ] **Step 1: Add failing tests** requiring the dashboard to query the latest claimed handoff and expose its identity/material summary.
- [ ] **Step 2: Run focused dashboard tests and verify failure.
- [ ] **Step 3: Fetch the latest claimed handoff after authentication and pass it into `ProfileEditor`.
- [ ] **Step 4: Update the saved-card preview copy to show the actual saved design and retain existing profile editing/publishing actions.
- [ ] **Step 5: Run unit tests, lint, and production build.

### Task 6: End-to-end verification and handoff documentation

**Files:**
- Modify: `README.md`
- Modify: `supabase/README.md`

- [ ] **Step 1: Document the migration and exact test flow.
- [ ] **Step 2: Run `pnpm test -- --run`, `pnpm run lint`, and `pnpm run build`.
- [ ] **Step 3: Start the local app and verify guest design → email request → callback destination → dashboard state with a real configured Supabase environment.
- [ ] **Step 4: Report any required Supabase migration/deployment action before claiming production readiness.
