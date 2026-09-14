# Phase 2 Profile Experience Completion Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the reusable client profile experience so one client can safely edit, preview, publish, unpublish, upload a photo, manage links, download a contact card, and optionally start an official LinkedIn import.

**Architecture:** Keep the existing Next.js App Router and Supabase ownership model. Server actions validate and mutate only the signed-in owner’s profile; a small client editor manages repeatable links and photo upload; public pages query only published records through RLS.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase Auth/Postgres/Storage, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-phase-2-profiles-design.md`

## Global Constraints

- One authenticated account owns exactly one profile.
- Draft profiles and draft links are never publicly readable.
- Profile text is plain text; URLs are validated before persistence.
- LinkedIn uses official OAuth/OIDC only and is hidden when credentials are absent.
- Preserve legacy static files while the new app is built.

---

### Task 1: Harden profile validation and repository boundaries

**Files:**
- Modify: `src/lib/profile/validation.ts`
- Modify: `src/lib/profile/validation.test.ts`
- Modify: `src/lib/profile/repository.ts`
- Modify: `src/lib/profile/types.ts` (create if missing)

**Interfaces:**
- `validateProfileInput(input)` returns `{ ok: true, value }` or `{ ok: false, error }`.
- `validateLinkInput(label, url)` rejects unsafe schemes and empty labels.
- `getOwnProfile(user)` returns the owner’s profile with links; `getPublishedProfile(slug)` returns only published data.

- [ ] Write failing tests for unsafe `javascript:` links, empty names, invalid slugs, and deterministic slug suggestions.
- [ ] Run the focused Vitest file and confirm the failures describe missing validation.
- [ ] Implement validation and typed profile/link records without changing the database contract.
- [ ] Run focused tests and the complete Vitest suite.

### Task 2: Implement transactional draft/link actions

**Files:**
- Modify: `src/app/actions/profile.ts`
- Create: `src/app/actions/profile-links.ts`
- Create: `src/app/actions/profile-photo.ts`
- Create: `src/lib/profile/links.ts`
- Create: `src/lib/profile/links.test.ts`

**Interfaces:**
- `saveProfileDraft(formData)` validates and updates the owner profile.
- `saveProfileLinks(formData)` replaces at most 12 ordered links for the owner.
- `uploadProfilePhoto(formData)` stores JPEG/PNG/WebP files up to 5 MB under the owner namespace and records `photo_path`.
- `deleteProfilePhoto()` removes only the owner’s recorded image.

- [ ] Write failing pure tests for link normalization, maximum link count, and allowed URL schemes.
- [ ] Run focused tests to verify they fail for the missing helper.
- [ ] Implement the helpers and server actions with owner-scoped Supabase queries and revalidation.
- [ ] Run tests, lint, and TypeScript/build checks.

### Task 3: Build the client profile editor and private preview

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/app/dashboard/profile-editor.tsx`
- Create: `src/app/dashboard/preview/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Editor fields cover name, slug, headline, tagline, bio, phone, email, photo, and ordered links.
- Save, publish, unpublish, preview, and public-profile links are clearly separated.
- The browser receives accessible labels, status text, and server-action error feedback.

- [ ] Add a focused render test for required labels and draft/published status copy.
- [ ] Implement a responsive dark-card editor based on Nikhil’s existing visual language.
- [ ] Add a private preview route that renders the current owner draft without exposing it to anonymous users.
- [ ] Verify the editor works at mobile and desktop widths through a local browser smoke test.

### Task 4: Make the public card reusable and safe

**Files:**
- Modify: `src/components/public-profile-card.tsx`
- Modify: `src/app/[slug]/page.tsx`
- Modify: `src/app/api/contact/[slug]/route.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Public card renders data-driven content, photo, custom links, call/email/WhatsApp actions, Save Contact, and footer.
- Draft or missing slugs return 404 and never expose private fields.
- VCF response is downloadable and generated only for published profiles.

- [ ] Add tests for published-only lookup and VCF escaping.
- [ ] Implement the reusable card layout with safe external-link attributes and fallback initials.
- [ ] Verify public page and VCF route against a published test profile in the local browser.

### Task 5: Add optional LinkedIn OIDC scaffolding

**Files:**
- Create: `src/lib/linkedin.ts`
- Create: `src/lib/linkedin.test.ts`
- Create: `src/app/auth/linkedin/route.ts`
- Create: `src/app/auth/linkedin/callback/route.ts`
- Modify: `src/app/dashboard/profile-editor.tsx`
- Modify: `.env.example`

**Interfaces:**
- `isLinkedInImportConfigured()` is false unless both credentials exist.
- OAuth routes use a signed-in owner, state protection, and the official `openid profile email` scopes.
- Callback maps available name, email, and picture into the owner’s draft only; it never publishes.

- [ ] Write failing tests for missing credentials and response mapping.
- [ ] Implement configuration guard and callback helpers without scraping or broad LinkedIn APIs.
- [ ] Show the import control only when configured; keep manual editing available always.
- [ ] Run full tests, lint, and production build.

### Task 6: Phase 2 verification and handoff

**Files:**
- Modify: `README.md`

- [ ] Run `pnpm test -- --run`, `pnpm lint`, and `pnpm build` from a clean command invocation.
- [ ] Browser-test sign-in, draft save, preview, publish, public card, unpublish, and VCF download.
- [ ] Record remaining Phase 3 dependencies in the README without claiming deployment.

