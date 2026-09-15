# IQ Card Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the approved IQ Card Admin Dashboard at `/admin`, backed by real Supabase client data and the existing secure admin workflows.

**Architecture:** Add one admin-only metadata table. Compose it with existing accounts, profiles, and onboarding progress in the server repository, then pass the resulting canonical `Client[]` into the supplied dashboard feature. Keep visual components client-side and selectors pure; inject server actions for mutations.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Supabase Postgres/Auth, Vitest, React Testing Library, route-scoped CSS.

**Spec:** `docs/superpowers/specs/2026-09-15-iq-card-admin-dashboard-design.md`

## Global Constraints

- Preserve the approved warm-white editorial visual language; do not introduce dark SaaS styling, gradients, or a UI kit.
- Keep all derived values based on one canonical `Client[]` dataset.
- Reuse `user_accounts`, `profiles`, and `onboarding_progress`; add only admin metadata not already represented.
- Keep mutations behind `requireAdminAccount()` and the server-side Supabase client.
- Verify 1600px, 1200px, 900px, and 390px layouts.

### Task 1: Add durable admin client metadata

**Files:**
- Create: `supabase/migrations/202609150003_add_client_admin_metadata.sql`
- Create: `src/lib/database/client-admin-metadata-migration.test.ts`

**Interfaces:** Creates `public.client_admin_metadata(owner_id, segment, invite_sent_at, invite_opened_at, last_active_at, created_at, updated_at)`.

- [ ] Write a failing migration test asserting the table, owner primary key, `segment text not null default 'Unassigned'`, RLS, and existing-client seed insert.
- [ ] Run `node_modules/.bin/vitest run src/lib/database/client-admin-metadata-migration.test.ts`; expect failure because the migration is absent.
- [ ] Implement the table, timestamp trigger, RLS, no public grants, and `role = 'client'` seed with `on conflict do nothing`.
- [ ] Rerun the focused test; expect pass.
- [ ] Commit: `git add supabase/migrations/202609150003_add_client_admin_metadata.sql src/lib/database/client-admin-metadata-migration.test.ts && git commit -m "feat: add admin client metadata"`.

### Task 2: Map real client records into the dashboard contract

**Files:**
- Create: `src/features/admin/types.ts`
- Create: `src/features/admin/selectors.ts`
- Create: `src/features/admin/selectors.test.ts`
- Modify: `src/lib/admin/repository.ts`
- Modify: `src/lib/admin/repository.test.ts`

**Interfaces:** `Client` has `id`, `name`, `email`, `status`, `profileUrl`, `joinedAt`, `completion`, `lastActiveAt`, `segment`, `inviteOpened`, `startedProfile`, and `completedProfile`. `listAdminClients(): Promise<Client[]>` returns this contract.

- [ ] Write failing repository tests for Live/Draft/Invited/No profile mapping and completion derived as `completed_steps.length / 6`.
- [ ] Write failing selector tests verifying filters, KPIs, breakdowns, funnel, charts, insights, and CSV inputs all derive from the same `Client[]`.
- [ ] Run `node_modules/.bin/vitest run src/lib/admin/repository.test.ts src/features/admin/selectors.test.ts`; expect failure.
- [ ] Fetch accounts, profiles, onboarding progress, and metadata in parallel. Map absent data to `Unassigned`, `false`, and `null`; do not invent activity history.
- [ ] Implement pure selector functions with no Supabase imports or side effects.
- [ ] Rerun focused tests; expect pass.
- [ ] Commit: `git add src/lib/admin/repository.ts src/lib/admin/repository.test.ts src/features/admin && git commit -m "feat: map real admin clients for dashboard"`.

### Task 3: Adapt the approved dashboard visual feature

**Files:**
- Create: `src/features/admin/AdminDashboard.tsx`
- Create: `src/features/admin/components/AdminShell.tsx`
- Create: `src/features/admin/components/AdminSidebar.tsx`
- Create: `src/features/admin/components/AdminTopbar.tsx`
- Create: `src/features/admin/components/AddClientPanel.tsx`
- Create: `src/features/admin/components/ClientTable.tsx`
- Create: `src/features/admin/components/{ClientsHeader,KpiStrip,OnboardingChart,StatusDonut,OnboardingFunnel,CompletionDistribution,InsightRail,ProgressBar,StatusBadge}.tsx`
- Create: `src/features/admin/admin.css`
- Create: `src/features/admin/AdminDashboard.test.tsx`

**Interfaces:** `AdminDashboard({ clients, actions })` consumes canonical data and async `onOnboard`, `onPublish`, `onUnpublish`, `onResend`, and `onSegmentChange` callbacks.

- [ ] Write a failing component test for the Clients heading, accessible search box, quick-insights rail, and a callback-driven publish action.
- [ ] Run `node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx`; expect failure.
- [ ] Copy the supplied feature structure, remove `mockClients` and local mutation state, preserve only view state such as search/filter/sort/pagination, and inject callbacks through props.
- [ ] Port the supplied CSS under `.iq-admin-dashboard`; reuse project colours where equivalent and keep focus, reduced-motion, desktop, tablet, and mobile rules.
- [ ] Rerun the component test; expect pass.
- [ ] Commit: `git add src/features/admin && git commit -m "feat: add approved admin dashboard UI"`.

### Task 4: Connect server actions and the protected route

**Files:**
- Modify: `src/app/actions/admin.ts`
- Modify: `src/app/actions/admin.test.ts`
- Modify: `src/lib/admin/validation.ts`
- Modify: `src/lib/admin/validation.test.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/loading.tsx`
- Create: `src/app/admin/page.test.tsx`

**Interfaces:** Adds `updateClientSegment(formData)` and metadata updates within existing onboarding/resend workflows. `/admin` passes real data and action adapters to `AdminDashboard`.

- [ ] Write failing action tests asserting onboarding/resend update `invite_sent_at`, segment values are trimmed and limited to 60 characters, every action requires an admin, and each success revalidates `/admin`.
- [ ] Write a failing route test asserting `/admin` calls `requireAdminAccount`, obtains `listAdminClients`, and mounts `AdminDashboard`.
- [ ] Run `node_modules/.bin/vitest run src/app/actions/admin.test.ts src/lib/admin/validation.test.ts src/app/admin/page.test.tsx`; expect failure.
- [ ] Implement metadata upsert/update through the service-role client, retain `admin_set_profile_publication` for status changes, and replace legacy admin markup with the dashboard while preserving `force-dynamic` and error feedback.
- [ ] Rerun focused tests; expect pass.
- [ ] Commit: `git add src/app/admin src/app/actions/admin.ts src/app/actions/admin.test.ts src/lib/admin/validation.ts src/lib/admin/validation.test.ts && git commit -m "feat: connect admin dashboard workflows"`.

### Task 5: Perform complete verification

**Files:**
- Modify: `src/features/admin/AdminDashboard.test.tsx`
- Modify: `src/app/admin/page.test.tsx`

- [ ] Add component coverage for directory search, status filtering, table pagination, CSV export, and publish/unpublish/resend callback invocation.
- [ ] Run `node_modules/.bin/vitest run src/features/admin/AdminDashboard.test.tsx src/app/admin/page.test.tsx`; expect pass.
- [ ] Run `node_modules/.bin/vitest run && node_modules/.bin/next build`; expect all tests and production build to pass.
- [ ] Inspect authenticated `/admin` at 1600px, 1200px, 900px, and 390px. Confirm the sidebar and insight rail collapse progressively, add-client controls remain usable, the table stays readable, and admin CSS does not leak to public routes.
- [ ] Commit: `git add src/features/admin/AdminDashboard.test.tsx src/app/admin/page.test.tsx && git commit -m "test: verify responsive admin dashboard"`.
