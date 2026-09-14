# IQ Card Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the secure Next.js/Supabase foundation for IQ Card accounts, email magic-link authentication, and client/admin route protection.

**Architecture:** A Next.js App Router app in `src/` uses Supabase Auth for magic links and Supabase Postgres for application-owned user records. Server-side helpers own session lookup, role checks, safe return-path validation, and redirects; database RLS enforces ownership independently from UI routing.

**Tech Stack:** Next.js App Router, TypeScript, React, Supabase (`@supabase/ssr`, `@supabase/supabase-js`), Vitest, Testing Library, Vercel-ready environment configuration.

**Spec:** `docs/superpowers/specs/2026-08-30-phase-1-foundation-design.md`

## Global Constraints

- Do not edit or delete existing static profile HTML, image, or VCF files.
- Use email magic links; do not introduce password authentication.
- One user account has exactly one role: `client` or `admin`.
- Never expose `IQCARD_ADMIN_EMAILS` or Supabase service-role credentials to browser code.
- All protected route authorization must run server-side.
- Supabase RLS must be enabled for application tables.
- The repository is not currently a Git checkout; do not attempt commits or worktree creation.

---

### Task 1: Scaffold the application and test runner

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `.gitignore`
- Create: `.env.example`

**Interfaces:**
- Produces the Next.js application commands `dev`, `build`, `start`, `lint`, and `test`.
- Produces a Vitest environment that can run TypeScript unit tests under `src/**/*.test.ts`.

- [ ] **Step 1: Create a failing smoke test**

```ts
import { describe, expect, it } from 'vitest'

describe('test environment', () => {
  it('runs TypeScript unit tests', () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 2: Run the smoke test before configuring Vitest**

Run: `npm test -- --run src/test/smoke.test.ts`

Expected: FAIL because the test command/configuration does not exist yet.

- [ ] **Step 3: Add the minimum application and test configuration**

Create the package scripts, TypeScript configuration, Next.js App Router layout/page, global CSS, Vitest configuration, test setup, `.gitignore`, and an `.env.example` containing only the required variable names from the spec.

- [ ] **Step 4: Re-run the smoke test**

Run: `npm test -- --run src/test/smoke.test.ts`

Expected: PASS.

- [ ] **Step 5: Verify the production application compiles**

Run: `npm run build`

Expected: successful production build.

### Task 2: Add typed runtime configuration

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/env.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `getPublicEnv(): { supabaseUrl: string; supabaseAnonKey: string; siteUrl: string }`.
- Produces `getAdminEmails(): Set<string>` for server-only role bootstrap.

- [ ] **Step 1: Write failing tests for environment validation**

```ts
it('normalizes comma-separated administrator emails', () => {
  expect(parseAdminEmails(' Admin@IQCard.in,second@iqcard.in ')).toEqual(
    new Set(['admin@iqcard.in', 'second@iqcard.in']),
  )
})

it('rejects an empty public site URL', () => {
  expect(() => getPublicEnv({ NEXT_PUBLIC_SITE_URL: '' })).toThrow('NEXT_PUBLIC_SITE_URL')
})
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- --run src/lib/env.test.ts`

Expected: FAIL because the environment module does not exist.

- [ ] **Step 3: Implement minimal validation and parsing**

Use small pure functions that accept an optional environment object in tests and use `process.env` in production. Validate required public variables, normalize the site URL, and trim/lowercase allow-listed email addresses.

- [ ] **Step 4: Re-run the tests**

Run: `npm test -- --run src/lib/env.test.ts`

Expected: PASS.

### Task 3: Implement role and return-path helpers

**Files:**
- Create: `src/lib/auth/roles.ts`
- Create: `src/lib/auth/roles.test.ts`

**Interfaces:**
- Produces `type UserRole = 'client' | 'admin'`.
- Produces `destinationForRole(role: UserRole): '/dashboard' | '/admin'`.
- Produces `safeReturnPath(candidate: string | null): string | null`.
- Produces `isAdminEmail(email: string, allowList: Set<string>): boolean`.

- [ ] **Step 1: Write failing behavior tests**

```ts
it('sends administrators to the admin portal', () => {
  expect(destinationForRole('admin')).toBe('/admin')
})

it('rejects external return URLs', () => {
  expect(safeReturnPath('https://evil.example')).toBeNull()
})

it('allows internal return URLs', () => {
  expect(safeReturnPath('/dashboard?welcome=1')).toBe('/dashboard?welcome=1')
})
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- --run src/lib/auth/roles.test.ts`

Expected: FAIL because the role helper module does not exist.

- [ ] **Step 3: Implement the smallest pure helper module**

Do not depend on Next.js or Supabase. Permit only paths beginning with one slash, and reject `//`, backslashes, protocol prefixes, and empty values.

- [ ] **Step 4: Re-run the tests**

Run: `npm test -- --run src/lib/auth/roles.test.ts`

Expected: PASS.

### Task 4: Add Supabase clients and database migration

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `supabase/migrations/202608300001_create_user_accounts.sql`
- Create: `supabase/README.md`

**Interfaces:**
- Produces `createBrowserClient()`, `createServerClient()`, and `updateSession(request)` helpers.
- Produces a `public.user_accounts` table with RLS, owner-read policy, admin-read policy, timestamps, a role check constraint, and a trigger that creates each initial `client` record.

- [ ] **Step 1: Write migration assertions as SQL comments and a schema verification checklist**

Document expected schema properties: UUID primary key referencing `auth.users`, allowed roles, RLS enabled, a no-client-role-escalation policy, and a signup trigger. The checks will be executed with Supabase CLI after project credentials are available.

- [ ] **Step 2: Add Supabase client helpers and the migration**

Use `@supabase/ssr` cookie adapters. Keep the server client and middleware client separate. The migration must define a `handle_new_user` trigger function that inserts a `client` role record, plus an admin-role promotion function that reads only a server-set configuration value or is invoked from a secure server action; clients must never update their own role.

- [ ] **Step 3: Add setup instructions**

Document how to create/link the Supabase project, apply the migration, set redirect URLs, set required environment variables, and bootstrap the first administrator.

- [ ] **Step 4: Type-check the application**

Run: `npm run lint`

Expected: PASS.

### Task 5: Build authentication pages and callback

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/login-form.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/auth-code-error/page.tsx`
- Create: `src/app/actions/auth.ts`
- Create: `src/lib/auth/account.ts`

**Interfaces:**
- Produces the `/login` UI and `requestMagicLink(email, nextPath)` server action.
- Produces `/auth/callback?code=...&next=...`, which exchanges the code and redirects safely.
- Produces `getCurrentAccount()` which returns the authenticated user and `UserRole`, or `null`.

- [ ] **Step 1: Write failing tests for magic-link redirect selection**

```ts
it('uses the role destination when no safe next path is supplied', () => {
  expect(resolvePostLoginPath('client', null)).toBe('/dashboard')
})

it('uses an internal next path after sign-in', () => {
  expect(resolvePostLoginPath('client', '/dashboard?setup=1')).toBe('/dashboard?setup=1')
})
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- --run src/lib/auth/roles.test.ts`

Expected: FAIL because `resolvePostLoginPath` does not exist.

- [ ] **Step 3: Implement login, callback, and account lookup**

The login server action calls Supabase `signInWithOtp` with a callback URL based on `NEXT_PUBLIC_SITE_URL`. The callback exchanges the code, loads the account role, and redirects to the safe requested internal path or default role destination. Errors route to `/auth/auth-code-error` without exposing Supabase internals.

- [ ] **Step 4: Re-run tests and build**

Run: `npm test -- --run src/lib/auth/roles.test.ts && npm run build`

Expected: all tests pass and build succeeds.

### Task 6: Protect dashboard and admin routes

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/proxy.ts`
- Modify: `src/lib/auth/account.ts`

**Interfaces:**
- Produces server-only `requireAuthenticatedAccount()` and `requireAdminAccount()` guards.
- Produces protected `/dashboard` and `/admin` route shells.
- Produces a Next.js proxy that refreshes Supabase sessions and redirects unauthenticated protected-route requests.

- [ ] **Step 1: Write failing guard tests for authorization decisions**

```ts
it('denies a client access to an admin-only route', () => {
  expect(canAccessRoute('client', '/admin')).toBe(false)
})

it('allows an admin access to the dashboard', () => {
  expect(canAccessRoute('admin', '/dashboard')).toBe(true)
})
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- --run src/lib/auth/roles.test.ts`

Expected: FAIL because `canAccessRoute` does not exist.

- [ ] **Step 3: Implement pure access checks and server route guards**

Use the pure helper for test coverage. The dashboard server component redirects signed-out users to `/login`; the admin server component returns `forbidden()` for clients. The proxy must not be relied on as the only authorization layer.

- [ ] **Step 4: Re-run tests, lint, and build**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: all commands pass.

### Task 7: Configure hosted resources and perform end-to-end verification

**Files:**
- Modify: `.env.example`
- Modify: `supabase/README.md`
- Modify: `README.md`

**Interfaces:**
- Produces complete local and deployment setup documentation.

- [ ] **Step 1: Create/link a Supabase project and configure email redirect URLs**

Use the project owner’s Supabase account. Configure `http://localhost:3000/auth/callback` and the intended production callback URL. Do not print credentials in terminal output.

- [ ] **Step 2: Populate `.env.local` with real local values**

Copy `.env.example` and add values only locally. Add the first administrator email to `IQCARD_ADMIN_EMAILS`.

- [ ] **Step 3: Apply and verify the migration**

Run the migration against the configured Supabase project. Verify table schema, RLS enabled status, policies, trigger behavior, and the role constraint.

- [ ] **Step 4: Run local acceptance checks**

Run: `npm run dev`

Verify manually:

1. Request a magic link from `/login`.
2. Complete sign-in and confirm a new client reaches `/dashboard`.
3. Confirm a configured administrator reaches `/admin`.
4. Confirm a client entering `/admin` receives forbidden access.
5. Confirm a signed-out visitor is redirected to `/login` from `/dashboard`.
6. Confirm all existing static profile files remain in place.

- [ ] **Step 5: Run final automated verification**

Run: `npm test -- --run && npm run lint && npm run build`

Expected: all commands pass.
