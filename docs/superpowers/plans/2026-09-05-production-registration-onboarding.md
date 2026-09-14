# Production Registration and Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a design-first, passwordless registration flow that securely claims a guest card, resumes a server-persisted onboarding wizard, and routes completed users to their dashboard.

**Architecture:** Next.js Route Handlers create and confirm hashed registration intents in Supabase. A transactional database function binds an intent to the verified email owner, while server actions persist normalized profile data and onboarding progress after each wizard step. Existing checkout handoffs remain readable during rollout and card scrolling remains unchanged.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/PostgreSQL/Storage, Vitest, Vercel

**Spec:** `docs/superpowers/specs/2026-09-05-production-registration-onboarding-design.md`

## Global Constraints

- Keep `/customize` public and design-first.
- Use passwordless email authentication only in this release.
- Support direct token-hash verification and one-time-code fallback.
- Store only hashes of registration-intent tokens.
- Require verified email, first name, last name, and a unique public slug for publication.
- Persist onboarding progress server-side after every successful step.
- New profiles remain private until explicit publication.
- Preserve current checkout handoffs through a non-destructive transition.
- Do not modify card scrolling or WebGL behavior.
- The workspace root is not a Git repository, so every task ends with tests and a file review rather than a commit.

---

### Task 1: Registration intent contracts and token hashing

**Files:**
- Create: `src/lib/registration/types.ts`
- Create: `src/lib/registration/token.ts`
- Create: `src/lib/registration/token.test.ts`
- Create: `supabase/migrations/202609050002_create_registration_intents.sql`
- Create: `src/lib/registration/migration.test.ts`

**Interfaces:**
- Produces: `createRegistrationToken(): { raw: string; hash: string }`
- Produces: `hashRegistrationToken(raw: string): string`
- Produces: `registrationIntentExpiryMinutes: 30`
- Produces: `RegistrationIntent` and `RegistrationIntentStatus`

- [ ] **Step 1: Write failing token tests**

```ts
it('stores a deterministic SHA-256 hash instead of the raw token', () => {
  const token = createRegistrationToken()
  expect(token.raw).toMatch(/^[a-f0-9-]{36}$/)
  expect(token.hash).toBe(hashRegistrationToken(token.raw))
  expect(token.hash).toMatch(/^[a-f0-9]{64}$/)
  expect(token.hash).not.toContain(token.raw)
})
```

- [ ] **Step 2: Run the token test and verify failure**

Run: `node node_modules/vitest/vitest.mjs run src/lib/registration/token.test.ts`  
Expected: FAIL because the registration token module does not exist.

- [ ] **Step 3: Implement the token contract**

```ts
import { createHash, randomUUID } from 'node:crypto'

export const registrationIntentExpiryMinutes = 30
export function hashRegistrationToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}
export function createRegistrationToken() {
  const raw = randomUUID()
  return { raw, hash: hashRegistrationToken(raw) }
}
```

- [ ] **Step 4: Add a source-contract test for the migration** requiring `token_hash`, normalized email, first and last names, versioned JSON design payload, status constraint, timestamps, indexes, RLS, and no raw token column.

- [ ] **Step 5: Add the non-destructive migration** creating `registration_intents` with status values `pending`, `claimed`, `expired`, and `cancelled`, plus indexes on email, owner, expiry, and status.

- [ ] **Step 6: Run focused tests** and inspect the migration for accidental destructive statements.

---

### Task 2: Validated registration-intent creation

**Files:**
- Create: `src/lib/registration/validation.ts`
- Create: `src/lib/registration/validation.test.ts`
- Create: `src/lib/registration/repository.ts`
- Create: `src/lib/registration/repository.test.ts`
- Modify: `src/app/api/checkout/handoff/route.ts`
- Modify: `src/lib/customizer/customizer-entry.test.ts`

**Interfaces:**
- Consumes: `createRegistrationToken()` and `registrationIntentExpiryMinutes`
- Produces: `parseRegistrationRequest(value: unknown): RegistrationRequest | null`
- Produces: `createRegistrationIntent(input): Promise<{ token: string; intentId: string }>`

- [ ] **Step 1: Write failing validation tests** for normalized email, two-part names, supported design schema, bounded payload size, and invalid placeholders.

```ts
expect(parseRegistrationRequest({
  email: ' Owner@Example.com ',
  designId: 'IQD-ABC123',
  payload: { configuration: { identity: { name: 'Nikhil Rakesh' } } },
})).toMatchObject({ email: 'owner@example.com', firstName: 'Nikhil', lastName: 'Rakesh' })
expect(parseRegistrationRequest({ email: 'bad', designId: 'IQD-ABC123', payload: {} })).toBeNull()
```

- [ ] **Step 2: Run validation tests and verify expected failures.**

- [ ] **Step 3: Implement pure validation** and return field-specific error codes for `email`, `name`, `design`, and `payload`.

- [ ] **Step 4: Write failing repository tests** using a narrow injected Supabase-like adapter; assert that only `token_hash` is inserted and expiry is exactly 30 minutes ahead.

- [ ] **Step 5: Implement `createRegistrationIntent`** with a hashed token and idempotency lookup for a recent pending intent with the same normalized email and design ID.

- [ ] **Step 6: Update the handoff Route Handler** to create the registration intent before sending email, include the raw token only in the callback URL, and preserve the current JSON response shape.

- [ ] **Step 7: Return safe, field-specific 400 responses** and retryable 502 responses without exposing account existence, tokens, or provider messages.

- [ ] **Step 8: Run registration, customizer, and route tests.**

---

### Task 3: Atomic intent claim with verified-email matching

**Files:**
- Modify: `supabase/migrations/202609050002_create_registration_intents.sql`
- Create: `src/lib/registration/claim.ts`
- Create: `src/lib/registration/claim.test.ts`
- Modify: `src/app/auth/confirm/route.ts`
- Modify: `src/app/auth/confirm/route.test.ts`
- Modify: `src/lib/auth/handoff-claim.ts`

**Interfaces:**
- Consumes: `hashRegistrationToken(raw)`
- Produces: SQL RPC `claim_registration_intent(p_token_hash text, p_owner_id uuid, p_email text)`
- Produces: `claimRegistrationIntent(rawToken, account): Promise<ClaimResult>`

- [ ] **Step 1: Write failing SQL contract tests** requiring a security-definer function that checks pending status, expiry, normalized email equality, and unclaimed owner before updating exactly one row.

- [ ] **Step 2: Write failing TypeScript tests** for successful claim, wrong email, expired token, replay, and missing token.

```ts
expect(await claimRegistrationIntent('raw-token', {
  id: 'owner-1', email: 'owner@example.com', role: 'client',
})).toEqual({ status: 'claimed', intentId: 'intent-1' })
```

- [ ] **Step 3: Implement the SQL function** so claim validation and mutation occur in one transaction and return only the claimed intent identifier.

- [ ] **Step 4: Implement `claimRegistrationIntent`** using the server-only admin client and the token hash.

- [ ] **Step 5: Update `/auth/confirm`** to authenticate first, then claim the intent using the verified account email. Retain existing checkout-handoff claim only when no registration intent exists.

- [ ] **Step 6: Map claim outcomes** to `claimed`, `expired`, `already-used`, `email-mismatch`, and `missing`; route recoverable failures to a dedicated reason without logging secrets.

- [ ] **Step 7: Run focused auth and claim tests.**

---

### Task 4: Onboarding progress persistence and routing

**Files:**
- Create: `supabase/migrations/202609050003_create_onboarding_progress.sql`
- Create: `src/lib/onboarding/types.ts`
- Create: `src/lib/onboarding/progress.ts`
- Create: `src/lib/onboarding/progress.test.ts`
- Modify: `src/lib/auth/roles.ts`
- Modify: `src/lib/auth/roles.test.ts`
- Modify: `src/proxy.ts`

**Interfaces:**
- Produces: `OnboardingStep = 'identity' | 'contact' | 'content' | 'address' | 'preview' | 'publish'`
- Produces: `getOnboardingProgress(ownerId): Promise<OnboardingProgress>`
- Produces: `completeOnboardingStep(ownerId, step): Promise<OnboardingProgress>`
- Produces: `onboardingPath(step): string`

- [ ] **Step 1: Write failing progress tests** for the canonical step order, first incomplete step, idempotent completion, and final completion timestamp.

- [ ] **Step 2: Add the migration** with one row per owner, schema version `1`, constrained current step, completed-step array, timestamps, RLS owner policy, and updated-at trigger.

- [ ] **Step 3: Implement progress helpers** and validate database values before using them for redirects.

- [ ] **Step 4: Extend destination resolution tests** so incomplete clients go to `/onboarding/{step}`, complete clients go to `/dashboard`, and administrators go to `/admin`.

- [ ] **Step 5: Update server routing and proxy protection** for `/onboarding/:path*` without performing database work inside the proxy.

- [ ] **Step 6: Run progress, role, and proxy tests.**

---

### Task 5: Shared onboarding validation and server actions

**Files:**
- Create: `src/lib/onboarding/validation.ts`
- Create: `src/lib/onboarding/validation.test.ts`
- Create: `src/app/actions/onboarding.ts`
- Create: `src/app/actions/onboarding.test.ts`
- Modify: `src/lib/profile/validation.ts`
- Modify: `src/lib/profile/validation.test.ts`

**Interfaces:**
- Produces: `validateIdentityStep`, `validateContactStep`, `validateContentStep`, `validateAddressStep`
- Produces: `OnboardingActionState = { ok: boolean; fieldErrors: Record<string, string>; formError?: string; next?: string }`
- Produces: `saveIdentityStep`, `saveContactStep`, `saveContentStep`, `saveAddressStep`, `completeOnboarding`

- [ ] **Step 1: Write failing pure validation tests** for two-part names, optional contact fields, complete-or-empty links, reserved slugs, and publication readiness.

- [ ] **Step 2: Implement validation functions** returning stable field keys and plain-language messages.

- [ ] **Step 3: Write failing action tests** with injected repositories; assert no database write occurs for invalid input and successful data/progress writes occur together.

- [ ] **Step 4: Implement server actions** that authenticate the owner, validate form data, save only the current step fields, update progress, revalidate affected paths, and return action state instead of throwing expected validation errors.

- [ ] **Step 5: Add atomic slug reservation handling** and deterministic alternatives when a slug is unavailable.

- [ ] **Step 6: Run validation and action tests.**

---

### Task 6: Onboarding wizard shell and steps

**Files:**
- Create: `src/app/onboarding/layout.tsx`
- Create: `src/app/onboarding/[step]/page.tsx`
- Create: `src/app/onboarding/onboarding-wizard.tsx`
- Create: `src/app/onboarding/onboarding-styles.ts`
- Create: `src/app/onboarding/onboarding-page.test.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: onboarding progress, profile data, saved registration design, and Task 5 server actions
- Produces: accessible step UI for all six canonical steps

- [ ] **Step 1: Write failing render-contract tests** requiring progress navigation, step headings, required indicators, inline error regions, back/continue actions, private draft, and explicit publish actions.

- [ ] **Step 2: Implement the authenticated layout** with IQ navigation, progress indicator, saved-card summary, and a server-derived current step.

- [ ] **Step 3: Implement `OnboardingWizard`** with `useActionState`, pending states, focus management for the first invalid field, and no data loss after validation errors.

- [ ] **Step 4: Implement Identity** with separate first and last name fields, optional photo, role, and bio.

- [ ] **Step 5: Implement Contact** with immutable verified account email plus optional public email, phone, WhatsApp, location, and visibility controls.

- [ ] **Step 6: Implement Content** with complete-or-empty link rows and accessible add/remove controls.

- [ ] **Step 7: Implement Address** with normalized slug entry, availability status, reservation errors, and suggested alternatives.

- [ ] **Step 8: Implement Preview and Publish** using the real public-profile component, with separate private-save and publish actions.

- [ ] **Step 9: Add responsive and reduced-motion behavior** without changing `/customize` card scrolling styles.

- [ ] **Step 10: Run onboarding render tests, lint, and a local browser keyboard pass.**

---

### Task 7: Account bootstrap and dashboard handoff

**Files:**
- Modify: `src/lib/profile/repository.ts`
- Modify: `src/lib/profile/defaults.ts`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/lib/dashboard/dashboard-v6.ts`
- Modify: `src/lib/dashboard/dashboard-v6.test.ts`
- Create: `src/lib/onboarding/bootstrap.test.ts`

**Interfaces:**
- Consumes: claimed registration intent and onboarding progress
- Produces: `bootstrapOnboardingAccount(account): Promise<{ profile; progress; savedDesign }>`

- [ ] **Step 1: Write failing bootstrap tests** proving that the claimed first and last names prefill a new profile, existing profile data is never overwritten, and missing handoffs still create a safe private draft.

- [ ] **Step 2: Implement account bootstrap** as an idempotent server operation.

- [ ] **Step 3: Update dashboard routing** so incomplete onboarding redirects to its saved step and completed onboarding renders the dashboard.

- [ ] **Step 4: Keep the saved physical-card preview available** in onboarding and the completed dashboard.

- [ ] **Step 5: Run bootstrap and dashboard tests.**

---

### Task 8: Error recovery and resend flow

**Files:**
- Create: `src/app/register/check-email/page.tsx`
- Create: `src/app/register/check-email/resend-form.tsx`
- Create: `src/app/actions/resend-registration.ts`
- Create: `src/lib/auth/confirmation-errors.ts`
- Create: `src/lib/auth/confirmation-errors.test.ts`
- Modify: `src/app/auth/auth-code-error/page.tsx`
- Modify: `src/components/login-styles.ts`

**Interfaces:**
- Produces: stable reasons `expired`, `already-used`, `email-mismatch`, `browser-mismatch`, `invalid-link`, and `delivery-failed`
- Produces: resend action with server-enforced cooldown and generic success response

- [ ] **Step 1: Write failing reason-mapping tests** for provider and registration-claim errors.

- [ ] **Step 2: Implement safe reason mapping** without provider text or account enumeration.

- [ ] **Step 3: Implement the check-email page** with masked destination, resend countdown, change-email action, and return-to-card link.

- [ ] **Step 4: Implement resend** so it rotates or reuses the pending intent idempotently and preserves the saved card.

- [ ] **Step 5: Replace generic auth errors** with reason-specific copy and one primary recovery action.

- [ ] **Step 6: Run auth recovery tests and a local browser pass.**

---

### Task 9: Structured registration observability

**Files:**
- Create: `src/lib/observability/registration-events.ts`
- Create: `src/lib/observability/registration-events.test.ts`
- Modify: registration, confirmation, onboarding, and publish handlers from earlier tasks

**Interfaces:**
- Produces: `recordRegistrationEvent(name, context): void`
- Produces events defined in the approved specification with correlation ID, route, reason, and duration only

- [ ] **Step 1: Write failing redaction tests** proving raw email, token, and card payload values cannot appear in serialized event output.

- [ ] **Step 2: Implement a server-only structured logger** with an allow-list of event names and fields.

- [ ] **Step 3: Instrument intent creation, email request, confirmation, claim, step save, completion, and publication boundaries.**

- [ ] **Step 4: Run observability tests** and inspect representative log lines for personal data.

---

### Task 10: Feature flag, compatibility rollout, and complete verification

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/lib/env.test.ts`
- Modify: `README.md`
- Modify: `supabase/README.md`
- Create: `docs/registration-rollout.md`

**Interfaces:**
- Produces: `IQCARD_ONBOARDING_V2` server-side feature flag
- Produces: documented migration, deployment, smoke-test, monitoring, and rollback sequence

- [ ] **Step 1: Write failing environment tests** for explicit enabled and disabled flag values with a disabled default.

- [ ] **Step 2: Implement the flag** and route only newly confirmed clients into the new wizard when enabled.

- [ ] **Step 3: Document migration order** for registration intents and onboarding progress, plus required Supabase Site URL, redirect allow-list, direct token-hash template, and custom SMTP.

- [ ] **Step 4: Document staged rollout**: deploy schema, deploy application with flag disabled, run compatibility smoke tests, enable preview, run real-mailbox E2E, enable production, observe, then remove legacy paths later.

- [ ] **Step 5: Run the complete unit suite**

Run: `node node_modules/vitest/vitest.mjs run`  
Expected: all tests pass with zero failures.

- [ ] **Step 6: Run lint**

Run: `node node_modules/eslint/bin/eslint.js src`  
Expected: zero errors; existing image-optimization warnings are recorded separately.

- [ ] **Step 7: Run the production build**

Run: `node node_modules/next/dist/bin/next build`  
Expected: successful TypeScript check, page generation, and route manifest.

- [ ] **Step 8: Run local browser journeys** for invalid fields, same-browser confirmation compatibility, onboarding resume, private draft, and publish readiness.

- [ ] **Step 9: Deploy a preview only after explicit deployment authorization**, apply migrations in order, and run a dedicated test-mailbox journey before production promotion.

- [ ] **Step 10: Confirm rollback** by disabling `IQCARD_ONBOARDING_V2`; existing clients and legacy handoffs must continue to reach the current dashboard setup.
