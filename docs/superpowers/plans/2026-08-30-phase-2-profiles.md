# IQ Card Phase 2 Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build private client profile editing, publishing, reusable public cards, photo uploads, VCF downloads, and optional basic LinkedIn import.

**Architecture:** Supabase owns profile, link, and storage data with RLS. Server actions mutate drafts; server pages render dashboard previews and published cards. Pure validation/slug/VCF functions are unit-tested before integration.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Auth/Postgres/Storage, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-phase-2-profiles-design.md`

## Global Constraints

- Preserve all legacy static profile files.
- One user has one profile.
- Drafts are never public.
- Do not scrape LinkedIn; import only with configured official OAuth credentials.
- Enforce all ownership in RLS and server actions.

---

### Task 1: Profile schema and security

**Files:**
- Create: `supabase/migrations/202608300002_create_profiles.sql`
- Modify: `supabase/README.md`

**Interfaces:**
- Produces `profiles` and `profile_links` tables, profile status constraint, public published-read policies, owner-only write policies, and `profile-images` storage policies.

- [ ] Write SQL acceptance checks for unique `owner_id`, unique `slug`, public published-only reads, and private owner-only reads.
- [ ] Apply migration in Supabase SQL Editor after user confirmation.
- [ ] Verify schema and RLS in Supabase Table Editor.

### Task 2: Test-first profile validation and VCF generation

**Files:**
- Create: `src/lib/profile/validation.ts`
- Create: `src/lib/profile/validation.test.ts`
- Create: `src/lib/profile/vcard.ts`
- Create: `src/lib/profile/vcard.test.ts`

**Interfaces:**
- Produces `suggestSlug(name)`, `validateSlug(slug)`, `isReservedSlug(slug)`, `normalizePhone(phone)`, and `createVCard(profile)`.

- [ ] Write failing tests for `Nikhil Rakesh -> nikhil-rakesh`, reserved `admin`, invalid characters, and a VCF with name/phone/email.
- [ ] Run Vitest and confirm expected failure.
- [ ] Implement minimal pure helpers and rerun tests until passing.

### Task 3: Server data access and draft actions

**Files:**
- Create: `src/lib/profile/types.ts`
- Create: `src/lib/profile/repository.ts`
- Create: `src/app/actions/profile.ts`

**Interfaces:**
- Produces `getOwnProfile()`, `getPublishedProfile(slug)`, `createDraftForOwner()`, `saveProfileDraft(input)`, `publishProfile()`, and `unpublishProfile()`.

- [ ] Add failing validation tests for missing name and invalid slug during publish.
- [ ] Implement owner-scoped Supabase queries and server actions.
- [ ] Re-run all profile tests and type-check/build.

### Task 4: Dashboard profile editor and preview

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/profile-editor.tsx`
- Create: `src/app/dashboard/preview/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes draft profile data and profile actions.
- Produces private profile editing with save, preview, publish, and unpublish controls.

- [ ] Test slug helper and publish validation first.
- [ ] Build accessible editor inputs for photo, text, contact fields, slug, and ordered links.
- [ ] Verify draft remains inaccessible at its slug before publish.

### Task 5: Public profile, photo upload, and VCF route

**Files:**
- Create: `src/app/[slug]/page.tsx`
- Create: `src/app/api/contact/[slug]/route.ts`
- Create: `src/app/actions/profile-photo.ts`
- Create: `src/components/public-profile-card.tsx`

**Interfaces:**
- Produces public published-card rendering, published-only VCF route, and owner-only photo upload.

- [ ] Write failing VCF and published-lookup tests.
- [ ] Implement card based on the Nikhil visual direction and safe public metadata.
- [ ] Verify a draft returns 404 and a published card renders/exports VCF.

### Task 6: Optional LinkedIn import setup

**Files:**
- Create: `src/app/auth/linkedin/route.ts`
- Create: `src/app/auth/linkedin/callback/route.ts`
- Create: `src/lib/linkedin.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces `isLinkedInImportConfigured()` and OAuth routes that import basic approved data into the owner’s draft.

- [ ] Write failing tests for “not configured” behavior.
- [ ] Implement OAuth only when `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` exist; otherwise hide the import control.
- [ ] Build, lint, and manually verify manual onboarding still works without LinkedIn credentials.

### Task 7: Final verification

**Files:**
- Modify: `README.md`

- [ ] Run `vitest --run`, ESLint, and `next build`.
- [ ] Manually verify draft → preview → publish → public card → VCF download.
- [ ] Verify a second account cannot read or modify the first account’s draft.
