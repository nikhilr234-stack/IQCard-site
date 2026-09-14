# Complete Site Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair every confirmed security, integrity, workflow, migration, and accessibility defect from the 2026-09-06 audit.

**Architecture:** Add one backward-compatible Supabase migration for policy and transactional operations, then route all affected Server Actions through small tested service functions. Treat browser card input as selections only and derive commercial/manufacturing data on the server. Keep UI changes within the existing dashboard, public-profile, and customizer components.

**Tech Stack:** Next.js 16.3 App Router, React 19, TypeScript, Supabase/PostgreSQL RLS and RPCs, Vitest, static HTML/JavaScript customizer.

**Spec:** `docs/superpowers/specs/2026-09-06-complete-site-repair-design.md`

## Global Constraints

- Preserve existing production profile URLs, records, registration links, and Storage objects.
- Use additive migrations; do not rewrite already-applied migrations.
- Derive price and manufacturing fields on the server from strictly validated selections.
- Every behavior change requires a failing regression test before implementation.
- Do not introduce service-role access into ordinary dashboard operations.
- This workspace root is not a Git repository, so commit steps cannot run here; capture each completed task in the final changed-file summary instead.

---

### Task 1: Verified route and admin authorization

**Files:**
- Modify: `src/lib/supabase/proxy.ts`
- Modify: `src/proxy.ts`
- Modify: `src/proxy.test.ts`
- Modify: `src/lib/auth/account.ts`
- Modify: `src/app/admin/page.tsx`
- Create: `src/lib/auth/account.test.ts`

**Interfaces:**
- Produces: `updateSession(request): Promise<{ response: NextResponse; user: User | null }>`
- Produces: `requireAdminAccount(): Promise<CurrentAccount>` that redirects non-admin users to `/dashboard?error=admin-only` without experimental Next.js APIs.

- [ ] **Step 1: Write failing proxy regressions**

Add cases that require `config.matcher` to contain `/dashboard/:path*`, redirect `/dashboard/preview` when `updateSession` returns `user: null`, ignore a synthetic `sb-project-auth-token` cookie, and continue only when the mocked session result includes a user.

```ts
expect(config.matcher).toContain('/dashboard/:path*')
expect((await proxy(request)).headers.get('location')).toContain('/login?next=')
```

- [ ] **Step 2: Run the focused test and confirm red**

Run: `node_modules/.bin/vitest run src/proxy.test.ts`
Expected: failures for the nested matcher and synthetic-cookie cases.

- [ ] **Step 3: Return the verified user from session refresh**

Capture `const { data: { user } } = await supabase.auth.getUser()` in `src/lib/supabase/proxy.ts`, return it with the response, and make `src/proxy.ts` authorize from `user` rather than `request.cookies`.

- [ ] **Step 4: Add and satisfy the admin regression**

Mock `getCurrentAccount()` dependencies and assert that a client account triggers the stable dashboard redirect while an admin account is returned. Remove `forbidden` from the imports.

- [ ] **Step 5: Run focused tests**

Run: `node_modules/.bin/vitest run src/proxy.test.ts src/lib/auth/account.test.ts`
Expected: all tests pass.

---

### Task 2: Storage privacy and atomic database operations

**Files:**
- Create: `supabase/migrations/202609060002_secure_profiles_and_atomic_writes.sql`
- Create: `src/lib/database/secure-profiles-migration.test.ts`
- Modify: `src/lib/onboarding/services.ts`
- Modify: `src/lib/onboarding/action-runner.ts`
- Modify: `src/app/actions/onboarding.test.ts`
- Modify: `src/app/actions/profile-links.ts`
- Create: `src/app/actions/profile-links.test.ts`
- Modify: `src/lib/registration/repository.ts`
- Modify: `src/lib/registration/repository.test.ts`

**Interfaces:**
- Produces SQL RPC: `replace_own_profile_links(p_links jsonb)`.
- Produces SQL RPC: `complete_own_onboarding_publish(p_publish boolean)`.
- Produces SQL RPC: `replace_registration_intent(...)` executable only by `service_role`.
- Consumes these RPCs from authenticated or service-role Supabase clients.

- [ ] **Step 1: Write the migration contract test**

Read the new SQL as text and assert it drops `published profile images are readable`, adds exact `profiles.photo_path = storage.objects.name` publication checks, adds owner SELECT access, defines all three functions, sets safe `search_path`, checks `auth.uid()` for user RPCs, and restricts registration RPC execution to `service_role`.

- [ ] **Step 2: Confirm the migration test is red**

Run: `node_modules/.bin/vitest run src/lib/database/secure-profiles-migration.test.ts`
Expected: failure because the migration does not exist.

- [ ] **Step 3: Implement the additive SQL migration**

The Storage policy must use the exact object reference:

```sql
exists (
  select 1 from public.profiles
  where profiles.photo_path = storage.objects.name
    and profiles.status = 'published'
)
```

`replace_own_profile_links` must validate `auth.uid()`, delete and insert within one function call, and preserve sort order. `complete_own_onboarding_publish` must update profile publication and upsert the completed publish step in one transaction. `replace_registration_intent` must cancel the previous pending row and insert the replacement in the same function so any insert error rolls the cancellation back.

- [ ] **Step 4: Write failing service/action tests**

Assert onboarding publish calls one atomic service instead of `publish()` followed by `completeStep()`. Assert both link entry points call `replace_own_profile_links`. Assert registration uses one store method `replace(input)` and no longer exposes `cancelPending` plus `insert`.

- [ ] **Step 5: Route application code through the RPCs**

Change the onboarding service interface to expose `completePublish(ownerId, publish)` and use it only for the publish step. Replace both delete/insert link sequences with the shared RPC. Change `RegistrationIntentStore` to:

```ts
export interface RegistrationIntentStore {
  replace(input: RegistrationIntentInsert): Promise<void>
}
```

- [ ] **Step 6: Run all Task 2 tests**

Run: `node_modules/.bin/vitest run src/lib/database/secure-profiles-migration.test.ts src/app/actions/onboarding.test.ts src/app/actions/profile-links.test.ts src/lib/registration/repository.test.ts`
Expected: all tests pass.

---

### Task 3: Canonical card registration payload

**Files:**
- Create: `src/lib/customizer/card-configuration.ts`
- Create: `src/lib/customizer/card-configuration.test.ts`
- Modify: `src/lib/registration/types.ts`
- Modify: `src/lib/registration/validation.ts`
- Modify: `src/lib/registration/validation.test.ts`
- Modify: `public/customize/index.html`
- Modify: `src/app/api/checkout/handoff/route.test.ts`

**Interfaces:**
- Produces: `canonicalizeCardPayload(value: unknown): CanonicalCardPayload | null`.
- Produces: `RegistrationRequest.payload` containing only canonical `schemaVersion`, `configuration`, `pricing`, and `manufacturing` fields.
- Uses the current material/core/craft/logo/back-layout enum values and the pricing table already represented by the customizer.

- [ ] **Step 1: Write failing canonicalization tests**

Cover every allowed enum, numeric placement bounds, name normalization, compatible payload version, custom-color rules, and custom-logo asset requirements. Assert that forged `pricing.total`, forged manufacturing material, unknown fields, non-finite values, and unsupported enum values cannot affect canonical output.

```ts
expect(result?.pricing.total).toBe(expectedServerTotal)
expect(result?.manufacturing.surfaces.front.material).toBe(result?.configuration.material)
```

- [ ] **Step 2: Confirm red**

Run: `node_modules/.bin/vitest run src/lib/customizer/card-configuration.test.ts src/lib/registration/validation.test.ts`
Expected: failures because arbitrary payloads are currently returned unchanged.

- [ ] **Step 3: Implement the pure canonical module**

Define explicit string unions and allowlists, clamp or reject placement values according to the customizer controls, rebuild the quote from fixed server constants, and rebuild manufacturing fields from the validated configuration. Do not copy derived client fields.

- [ ] **Step 4: Adopt canonicalization in registration validation**

Keep email, design ID, payload byte limit, and two-part name checks. Replace the raw `payload` result with `canonicalizeCardPayload(candidate.payload)` and return `invalid-payload` when it fails.

- [ ] **Step 5: Align the customizer submission contract**

Keep browser-side quote/manufacturing rendering for preview, but send the versioned configuration as the authoritative input. Update checkout tests to prove a modified browser payload is canonicalized before repository insertion.

- [ ] **Step 6: Run focused tests**

Run: `node_modules/.bin/vitest run src/lib/customizer/card-configuration.test.ts src/lib/registration/validation.test.ts src/app/api/checkout/handoff/route.test.ts`
Expected: all tests pass.

---

### Task 4: Reliable profile-photo lifecycle

**Files:**
- Modify: `next.config.ts`
- Create: `src/lib/profile/photo.ts`
- Create: `src/lib/profile/photo.test.ts`
- Modify: `src/app/actions/profile-photo.ts`
- Create: `src/app/actions/profile-photo.test.ts`
- Modify: `src/app/dashboard/profile-editor.tsx`

**Interfaces:**
- Produces: `PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024` shared by validation and UI.
- Produces client `PhotoForm` that auto-submits a selected file and exposes delete as an ordinary Server Action form.
- Preserves database consistency by clearing `photo_path` before best-effort object cleanup.

- [ ] **Step 1: Write failing size and lifecycle tests**

Test accepted MIME types, the exact 5 MB boundary, oversized rejection, upload cleanup after a failed database update, and delete ordering. The delete test must prove that a failed database clear never invokes Storage removal.

- [ ] **Step 2: Confirm red**

Run: `node_modules/.bin/vitest run src/lib/profile/photo.test.ts src/app/actions/profile-photo.test.ts`
Expected: delete-order and shared-limit failures.

- [ ] **Step 3: Extract validation and correct action ordering**

Validate through `src/lib/profile/photo.ts`. For deletion, update `photo_path` to null first; only then remove the old object. Treat failed physical removal as logged cleanup debt rather than restoring a broken database reference.

- [ ] **Step 4: Configure the framework upload limit**

Read the installed Next.js 16 Server Actions configuration guide and set `experimental.serverActions.bodySizeLimit` to a value that safely carries a 5 MB file plus multipart overhead, such as `'6mb'` if that is the installed documented key.

- [ ] **Step 5: Repair the photo UI**

Use a form ref and `requestSubmit()` from the file input change handler, include pending/status text with `aria-live`, and render the passed `deletePhotoAction` when a photo exists. Associate the input with its visible label.

- [ ] **Step 6: Run focused tests and lint the component**

Run: `node_modules/.bin/vitest run src/lib/profile/photo.test.ts src/app/actions/profile-photo.test.ts`
Run: `node_modules/.bin/eslint src/app/dashboard/profile-editor.tsx src/app/actions/profile-photo.ts src/lib/profile/photo.ts`
Expected: tests pass and lint has no errors.

---

### Task 5: Complete profile fields, visibility, URLs, and slugs

**Files:**
- Modify: `supabase/migrations/202609060002_secure_profiles_and_atomic_writes.sql`
- Modify: `src/lib/profile/types.ts`
- Modify: `src/lib/profile/validation.ts`
- Modify: `src/lib/profile/validation.test.ts`
- Modify: `src/app/actions/profile.ts`
- Modify: `src/app/dashboard/profile-editor.tsx`
- Modify: `src/lib/profile/public-profile.ts`
- Modify: `src/lib/profile/public-profile.test.ts`
- Modify: `src/components/public-profile-card.tsx`
- Modify: `src/lib/site-routing.ts`
- Modify: `src/lib/site-routing.test.ts`
- Modify: `src/app/dashboard/live-owner-center.tsx`
- Modify: `src/lib/profile/defaults.ts`
- Modify: `src/lib/profile/defaults.test.ts`
- Modify: `src/lib/admin/validation.ts`
- Modify: `src/lib/admin/validation.test.ts`

**Interfaces:**
- Produces: strict `validateEditableProfile(...)` with onboarding-equivalent limits and normalization.
- Produces: `publicProfileUrl(siteUrl, slug)` for display, copy, and share.
- Produces public view field `location: string | null` controlled by `location_visible`.

- [ ] **Step 1: Add failing tests for every field and visibility rule**

Cover name/headline/bio/email/phone/WhatsApp/location limits and formats, false visibility flags, visible location, configured site origins, reserved default slugs, and reserved admin slug candidates.

- [ ] **Step 2: Confirm red**

Run: `node_modules/.bin/vitest run src/lib/profile/validation.test.ts src/lib/profile/public-profile.test.ts src/lib/site-routing.test.ts src/lib/profile/defaults.test.ts src/lib/admin/validation.test.ts`
Expected: failures for currently unsupported fields and reserved draft slugs.

- [ ] **Step 3: Implement shared validation and URL generation**

Reuse onboarding normalization rules rather than duplicating regular expressions. Make `createDefaultProfileDraft` fall back to `profile`, then suffix reserved roots. Make `makeAvailableSlug` treat the reserved set as already taken.

- [ ] **Step 4: Extend dashboard fields and persistence**

Add controlled WhatsApp and location inputs plus checkboxes named `public_email_visible`, `phone_visible`, `whatsapp_visible`, and `location_visible`. Persist the validated booleans and normalized values from `saveProfile`.

- [ ] **Step 5: Preserve existing public contacts in the migration**

Backfill `public_email_visible = true` when a pre-visibility profile has non-empty email and `phone_visible = true` when it has non-empty phone. Keep WhatsApp/location false unless users explicitly enable them. Write the migration so reruns remain deterministic.

- [ ] **Step 6: Render location and use the configured origin**

Return visible location from `buildPublicProfileView`, render it as plain profile information, and pass `getPublicEnv().siteUrl` from the dashboard Server Component into client components. Remove all hardcoded `https://iqcard.in` construction from dashboard components.

- [ ] **Step 7: Run focused tests**

Run the five test files from Step 2 plus `src/app/dashboard/live-owner-center.test.ts`.
Expected: all tests pass.

---

### Task 6: Durable custom-logo restoration and saved-card parsing

**Files:**
- Create: `public/customize/logo-persistence.mjs`
- Create: `src/lib/customizer/logo-persistence.test.ts`
- Modify: `public/customize/index.html`
- Modify: `src/lib/dashboard/saved-card.ts`
- Modify: `src/lib/dashboard/saved-card.test.ts`
- Modify: `src/app/dashboard/saved-card-renderer.tsx`

**Interfaces:**
- Produces browser helpers `serializeLogoForStorage(logo)` and `restoreStoredLogo(value)`.
- A restored custom logo is valid only when `dataUrl` is a supported bounded image data URL; `objectUrl` is session-only.
- `parseSavedCardDesign` remains available when a canonical custom-logo asset is present.

- [ ] **Step 1: Add failing persistence tests**

Cover built-in logo, valid custom data URL round-trip, legacy custom metadata without data, invalid MIME data URL, and maximum persisted logo size. Assert checkout rejects legacy metadata-only custom logos.

- [ ] **Step 2: Confirm red**

Run: `node_modules/.bin/vitest run src/lib/customizer/logo-persistence.test.ts src/lib/dashboard/saved-card.test.ts`
Expected: custom-logo round-trip and availability failures.

- [ ] **Step 3: Implement bounded local persistence**

Retain `dataUrl` for a custom logo only when it passes MIME and byte limits. Never persist `objectUrl`. On restore, set mode to `iq` or require re-upload when binary data is unavailable; do not leave an apparently valid custom mode.

- [ ] **Step 4: Tighten checkout and saved-card behavior**

Require actual custom image data in `validateCheckoutConfiguration`. Preserve the canonical logo asset in the handoff payload. Let saved-card parsing render the rest of a custom-logo design and pass the usable asset to the renderer rather than returning `{ available: false }` solely because mode is custom.

- [ ] **Step 5: Run focused tests**

Run: `node_modules/.bin/vitest run src/lib/customizer/logo-persistence.test.ts src/lib/dashboard/saved-card.test.ts src/app/dashboard/saved-card-renderer.test.ts`
Expected: all tests pass.

---

### Task 7: Dialog, drawer, labels, and image accessibility

**Files:**
- Create: `src/lib/browser/focus-trap.ts`
- Create: `src/lib/browser/focus-trap.test.ts`
- Modify: `src/components/public-profile-menu.tsx`
- Modify: `src/app/dashboard/live-owner-center.tsx`
- Modify: `src/app/onboarding/onboarding-wizard.tsx`
- Modify: `src/app/dashboard/profile-editor.tsx`
- Modify: `src/components/public-profile-card.tsx`

**Interfaces:**
- Produces: `trapDialogFocus(container, event)` used by both dialog implementations.
- Both overlays focus their close button on entry, trap Tab/Shift+Tab, close on Escape, and restore the triggering element.

- [ ] **Step 1: Write failing focus-loop tests**

Using jsdom, test forward wrap, backward wrap, no-focusable fallback, and that Escape remains handled by the component. Add source/component assertions for unique input IDs and non-nested contact/visibility labels.

- [ ] **Step 2: Confirm red**

Run: `node_modules/.bin/vitest run src/lib/browser/focus-trap.test.ts src/app/onboarding/onboarding-page.test.ts src/app/dashboard/live-owner-center.test.ts`
Expected: focus-loop tests fail before the helper exists.

- [ ] **Step 3: Implement shared focus management**

Attach the helper to each dialog's keydown path, store the opener in a ref, focus the close control after opening, restore only if the opener is still connected, and prevent backdrop content from becoming part of the tab sequence.

- [ ] **Step 4: Correct form labels and image usage**

Give every input an ID and use `htmlFor`. Split the onboarding location text input and visibility checkbox into separate labels. Replace remote profile-photo `<img>` elements with `next/image` using explicit `fill`/`sizes`; retain native blob/data URL previews only with a narrowly scoped lint suppression and explanatory comment.

- [ ] **Step 5: Run focused tests and lint**

Run the tests from Step 2.
Run: `node_modules/.bin/eslint src/components/public-profile-menu.tsx src/app/dashboard/live-owner-center.tsx src/app/onboarding/onboarding-wizard.tsx src/app/dashboard/profile-editor.tsx src/components/public-profile-card.tsx`
Expected: tests pass and the five prior raw-image warnings are resolved or narrowly justified.

---

### Task 8: LinkedIn and admin retry safety

**Files:**
- Modify: `src/lib/linkedin.ts`
- Modify: `src/lib/linkedin.test.ts`
- Modify: `src/app/auth/linkedin/callback/route.ts`
- Create: `src/app/auth/linkedin/callback/route.test.ts`
- Create: `src/lib/admin/onboarding.ts`
- Create: `src/lib/admin/onboarding.test.ts`
- Modify: `src/app/actions/admin.ts`
- Modify: `src/lib/admin/messages.ts`
- Modify: `src/lib/admin/messages.test.ts`

**Interfaces:**
- Produces: `fetchLinkedInJson(url, init, timeoutMs)` mapping abort/network errors to typed temporary failures.
- Produces: `ensureClientProvisioned(input, dependencies)` that finds or invites the Auth user, upserts the account, and inserts/upserts the profile idempotently.

- [ ] **Step 1: Write failing provider and retry tests**

Test timeout, thrown network error, non-OK token/profile response, existing invited user retry, existing account without profile, and repeated successful provisioning.

- [ ] **Step 2: Confirm red**

Run: `node_modules/.bin/vitest run src/lib/linkedin.test.ts src/app/auth/linkedin/callback/route.test.ts src/lib/admin/onboarding.test.ts`
Expected: failures for thrown fetches and partial admin state.

- [ ] **Step 3: Implement bounded LinkedIn requests**

Use `AbortSignal.timeout` when supported by the installed runtime or an `AbortController` with cleared timer. Catch only provider/network failures around the two fetches and redirect with `temporary_error`; preserve authentication redirects and unexpected application errors.

- [ ] **Step 4: Implement idempotent admin provisioning**

Look up an existing Auth identity by normalized email before inviting. Upsert `user_accounts`, read existing profile by owner, and only create the missing profile. Generate reserved-safe slugs. Return structured failure codes that the action maps through `adminActionMessage`.

- [ ] **Step 5: Run focused tests**

Run the tests from Step 2 plus `src/lib/admin/messages.test.ts src/lib/admin/validation.test.ts`.
Expected: all tests pass.

---

### Task 9: Idempotent legacy photo import

**Files:**
- Modify: `src/lib/migration/legacy-importer.ts`
- Modify: `src/lib/migration/legacy-importer.test.ts`
- Modify: `scripts/migrate-legacy-profiles.ts`
- Modify: `docs/registration-rollout.md`

**Interfaces:**
- Changes `LegacyImportStore.uploadPhoto(...)` to return the stored path.
- Adds `LegacyImportStore.updateProfile(profileId, values)` and idempotent link replacement.
- Treats an existing profile owned by the matching user as resumable rather than an automatic conflict when its slug matches the import record.

- [ ] **Step 1: Write failing importer regressions**

Test photo-path persistence, retry after profile-only success, retry after links success, retry after photo upload, and genuine owner/slug conflicts. Assert successful retries do not duplicate links or Storage files.

- [ ] **Step 2: Confirm red**

Run: `node_modules/.bin/vitest run src/lib/migration/legacy-importer.test.ts`
Expected: photo-path and retry cases fail.

- [ ] **Step 3: Make the import resumable**

Use deterministic `${ownerId}/legacy/${basename}` object paths with `upsert: true`. Replace links for the imported profile, update `photo_path` after upload, and reuse an existing same-owner/same-slug draft on retries.

- [ ] **Step 4: Document operational behavior**

Add the new migration ordering, contact visibility backfill, custom-logo compatibility behavior, and legacy-import retry command to `docs/registration-rollout.md`.

- [ ] **Step 5: Run all migration tests**

Run: `node_modules/.bin/vitest run src/lib/migration/legacy-importer.test.ts src/lib/migration/legacy-cli.test.ts src/lib/migration/legacy-profile.test.ts src/lib/migration/legacy-sources.test.ts`
Expected: all tests pass.

---

### Task 10: Full verification and browser acceptance

**Files:**
- Modify only files required to resolve verification failures caused by Tasks 1–9.

**Interfaces:**
- No new production interface; this task proves the complete repair against the approved spec.

- [ ] **Step 1: Run the complete automated suite**

Run: `node_modules/.bin/vitest run`
Expected: zero failed test files and zero failed tests.

- [ ] **Step 2: Run lint**

Run: `node_modules/.bin/eslint src`
Expected: zero errors and no unexplained `<img>` warnings in repaired components.

- [ ] **Step 3: Run the production build**

Run: `node_modules/.bin/next build`
Expected: exit code 0 with all application routes compiled.

- [ ] **Step 4: Audit production dependencies**

Run: `pnpm audit --prod`
Expected: zero known production vulnerabilities; if network restrictions block the audit, request the required network approval and rerun it.

- [ ] **Step 5: Exercise production route behavior**

Start the production server and verify signed-out `/dashboard`, `/dashboard/preview`, `/admin`, and onboarding URLs return server redirects with preserved return paths. Verify a synthetic auth-cookie name does not bypass the redirect. With a client session, verify `/admin` follows the stable admin-only path rather than returning 500.

- [ ] **Step 6: Exercise desktop and mobile workflows**

At desktop width and 375 px width, verify photo upload/delete, all visibility controls, location rendering, profile link replacement, custom-logo save/restore/checkout, copied public URL, dialog/drawer keyboard looping, and lack of horizontal overflow or console errors.

- [ ] **Step 7: Review the approved spec line by line**

Map every completion criterion in `docs/superpowers/specs/2026-09-06-complete-site-repair-design.md` to a passing automated test, browser observation, SQL policy check, or documented environment limitation. Report any unverified production-only behavior explicitly rather than marking it complete.
