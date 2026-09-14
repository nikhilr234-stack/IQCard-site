# Cover Digital Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a draft/publish-safe Cover public-profile template and an owner-only Digital Profile editor without changing Minimal.

**Architecture:** A new `profile_presentations` record stores normalized draft and published presentation settings separately from existing profile identity/content. Public and preview routes resolve their appropriate presentation snapshot into a shared renderer, while the dashboard editor changes only presentation state and media.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/PostgreSQL/Storage, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-09-14-cover-digital-profile-design.md`

## Global Constraints

- Keep the existing Minimal/Professional public renderer visually unchanged and label it `01 Minimal` in the new editor.
- Add Cover as `02 Cover`; public visitors do not receive a template selector.
- Identity, contact data, photo, links, and bio remain in `profiles`/`profile_links`, never inside presentation settings.
- Cover settings are limited to cover media, `0.15–0.70` overlay, vertical focal position, lower-left/center alignment, and optional photo override.
- Save Draft must not alter the published public URL; Publish must promote presentation atomically before making it live.
- Use the existing image type/size validation and secure owner/public media access pattern.
- Preview reuses production profile renderers and disables contact export only in preview mode.

---

## File structure

- `src/lib/profile/presentation.ts`: presentation types, defaults, normalizer, and pure resolver.
- `src/lib/profile/presentation.test.ts`: normalizer and draft/published isolation tests.
- `src/lib/profile/repository.ts`: owner/public presentation reads alongside existing profile reads.
- `src/app/actions/presentation.ts`: server actions for save and publication promotion.
- `src/app/actions/presentation.test.ts`: action/RPC/revalidation contracts.
- `supabase/migrations/202609140001_add_profile_presentations.sql`: tables, RLS, draft save/publish RPCs, and secure Cover media rules.
- `src/app/actions/profile-cover.ts`, `src/app/api/profile-cover/route.ts`: validated Cover media mutation and delivery.
- `src/components/public-profile.tsx`: shared Minimal/Cover renderer selection.
- `src/components/cover-profile.tsx`: Cover public markup using existing profile content/view model.
- `src/components/cover-profile.test.tsx`: renderer selection, preview safety, and Cover fallback tests.
- `src/app/dashboard/digital-profile/page.tsx`: protected server entrypoint.
- `src/app/dashboard/digital-profile/digital-profile-editor.tsx`: client editor and real-time phone preview.
- `src/app/globals.css`: scoped Cover and Digital Profile styles.
- `src/app/[slug]/page.tsx`, `src/app/dashboard/preview/page.tsx`, `src/app/dashboard/profile-editor.tsx`, `src/app/dashboard/live-owner-center.tsx`: route renderer adoption and owner links.

### Task 1: Define presentation settings and normalization

**Files:**
- Create: `src/lib/profile/presentation.ts`
- Create: `src/lib/profile/presentation.test.ts`
- Modify: `src/lib/profile/types.ts`

**Interfaces:**
- Produces `ProfileTemplate`, `CoverPresentation`, `ProfilePresentation`, `DEFAULT_PRESENTATION`, `normalizePresentation(input)`, and `resolvePresentation(presentation, mode)`.
- `resolvePresentation` returns `presentation.draft` for `mode: 'draft'` and `presentation.published` for `mode: 'published'`.

- [ ] **Step 1: Write the failing normalization tests**

```ts
it('clamps Cover controls without discarding a saved Cover when Minimal is selected', () => {
  const value = normalizePresentation({
    draft: { template: 'minimal', cover: { overlay: 9, focalY: -2, alignment: 'center', coverPath: 'cover.jpg' } },
  })
  expect(value.draft).toMatchObject({ template: 'minimal', cover: { overlay: 0.7, focalY: 0, alignment: 'center', coverPath: 'cover.jpg' } })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test src/lib/profile/presentation.test.ts`

Expected: FAIL because `presentation.ts` does not exist.

- [ ] **Step 3: Implement the smallest normalized presentation contract**

```ts
export const DEFAULT_PRESENTATION = { template: 'minimal', cover: { coverPath: null, overlay: 0.38, focalY: 50, alignment: 'lower-left', photoPathOverride: null } } as const
export function normalizePresentation(input: unknown): ProfilePresentation { /* object guards, clamp, defaults */ }
export function resolvePresentation(value: ProfilePresentation, mode: 'draft' | 'published') { return mode === 'draft' ? value.draft : value.published }
```

- [ ] **Step 4: Run the presentation tests to verify they pass**

Run: `pnpm test src/lib/profile/presentation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/lib/profile/presentation.ts src/lib/profile/presentation.test.ts src/lib/profile/types.ts && git commit -m "feat: define profile presentation settings"`

### Task 2: Persist draft and published presentation securely

**Files:**
- Create: `supabase/migrations/202609140001_add_profile_presentations.sql`
- Modify: `src/lib/profile/repository.ts`
- Modify: `src/lib/profile/types.ts`
- Test: `src/lib/profile/repository.test.ts`

**Interfaces:**
- Consumes `normalizePresentation`.
- Produces `getOwnProfilePresentation(ownerId)` and `getPublishedProfilePresentation(profileId)` with default fallback.
- SQL RPCs: `save_own_profile_presentation(p_draft jsonb)` and `publish_own_profile_presentation()`.

- [ ] **Step 1: Write repository/RPC contract tests**

```ts
it('falls back to Minimal defaults when a legacy profile has no presentation row', async () => {
  mockPresentationQuery.mockResolvedValue({ data: null, error: null })
  await expect(getPublishedProfilePresentation('profile-1')).resolves.toEqual(DEFAULT_PRESENTATION.published)
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `pnpm test src/lib/profile/repository.test.ts`

Expected: FAIL because presentation readers do not exist.

- [ ] **Step 3: Add the migration and readers**

```sql
create table public.profile_presentations (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  draft jsonb not null default '{"template":"minimal","cover":{}}',
  published jsonb not null default '{"template":"minimal","cover":{}}'
);
```

Implement RLS/privileges so owners can read only their row; use security-definer RPCs to validate an owner-bound profile and replace `draft`, then copy `draft` to `published`. Public profile lookup must select only `published` for published profiles. Update the public Cover storage policy to require a matching published Cover path.

- [ ] **Step 4: Run focused tests to verify they pass**

Run: `pnpm test src/lib/profile/repository.test.ts src/lib/profile/presentation.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add supabase/migrations/202609140001_add_profile_presentations.sql src/lib/profile/repository.ts src/lib/profile/repository.test.ts src/lib/profile/types.ts && git commit -m "feat: persist profile presentation drafts"`

### Task 3: Add presentation save/publish actions and Cover media flow

**Files:**
- Create: `src/app/actions/presentation.ts`
- Create: `src/app/actions/presentation.test.ts`
- Create: `src/app/actions/profile-cover.ts`
- Create: `src/app/actions/profile-cover.test.ts`
- Create: `src/app/api/profile-cover/route.ts`
- Create: `src/app/api/profile-cover/route.test.ts`
- Modify: `src/lib/profile/photo.ts`

**Interfaces:**
- Produces `savePresentationDraft(formData)`, `publishPresentation()`, `uploadProfileCover(formData)`, `deleteProfileCover()`.
- Cover actions accept `cover` and return/revalidate `coverPath` only after an authenticated owner write.

- [ ] **Step 1: Write failing server-action tests**

```ts
it('saves presentation draft without invoking the profile publication RPC', async () => {
  await savePresentationDraft(new FormData())
  expect(rpc).toHaveBeenCalledWith('save_own_profile_presentation', expect.any(Object))
  expect(rpc).not.toHaveBeenCalledWith('complete_own_onboarding_publish', expect.anything())
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/app/actions/presentation.test.ts src/app/actions/profile-cover.test.ts src/app/api/profile-cover/route.test.ts`

Expected: FAIL because the actions and route do not exist.

- [ ] **Step 3: Implement minimal authenticated actions**

Use `validateProfilePhoto` for Cover files, `profile-covers` for storage, UUID object names under the owner ID, cleanup only after replacement/removal succeeds, and the same no-store/content-type/path safeguards as `/api/profile-photo`. `publishPresentation` calls the new promotion RPC before the existing `complete_own_onboarding_publish` RPC, then revalidates `/dashboard`, `/dashboard/digital-profile`, and the resolved public slug.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/app/actions/presentation.test.ts src/app/actions/profile-cover.test.ts src/app/api/profile-cover/route.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/actions/presentation.ts src/app/actions/presentation.test.ts src/app/actions/profile-cover.ts src/app/actions/profile-cover.test.ts src/app/api/profile-cover/route.ts src/app/api/profile-cover/route.test.ts src/lib/profile/photo.ts && git commit -m "feat: save presentation drafts and cover media"`

### Task 4: Implement shared Minimal/Cover public rendering

**Files:**
- Create: `src/components/public-profile.tsx`
- Create: `src/components/cover-profile.tsx`
- Create: `src/components/cover-profile.test.tsx`
- Modify: `src/app/[slug]/page.tsx`
- Modify: `src/app/dashboard/preview/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- `PublicProfile({ profile, presentation, preview })` chooses `PublicProfileCard` for Minimal and `CoverProfile` for Cover.
- `CoverProfile` receives current profile data plus `ResolvedPresentation` and keeps `Save Contact` disabled in preview.

- [ ] **Step 1: Write the failing renderer tests**

```tsx
it('renders the published Cover presentation and keeps Save Contact inert in preview', () => {
  const html = renderToStaticMarkup(<PublicProfile profile={profile} presentation={cover} preview />)
  expect(html).toContain('cover-profile-shell')
  expect(html).toContain('Save Contact')
  expect(html).not.toContain('/api/contact/ada-lovelace')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/components/cover-profile.test.tsx`

Expected: FAIL because `PublicProfile` and `CoverProfile` do not exist.

- [ ] **Step 3: Implement the renderer and scoped CSS**

Keep `PublicProfileCard` unchanged for Minimal. Build Cover with page-level wallpaper, CSS custom properties for overlay/focal point, a top logo/menu, lower-third identity, compact photo, safe links from `buildPublicProfileView`, and background continuity through content/footer. Resolve owner preview with draft settings and public route with published settings.

- [ ] **Step 4: Run renderer tests to verify they pass**

Run: `pnpm test src/components/cover-profile.test.tsx src/lib/profile/public-profile.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/components/public-profile.tsx src/components/cover-profile.tsx src/components/cover-profile.test.tsx src/app/[slug]/page.tsx src/app/dashboard/preview/page.tsx src/app/globals.css && git commit -m "feat: render Cover public profiles"`

### Task 5: Build the Digital Profile dashboard editor

**Files:**
- Create: `src/app/dashboard/digital-profile/page.tsx`
- Create: `src/app/dashboard/digital-profile/digital-profile-editor.tsx`
- Create: `src/app/dashboard/digital-profile/digital-profile-editor.test.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/dashboard/profile-editor.tsx`
- Modify: `src/app/dashboard/live-owner-center.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- `DigitalProfileEditor` takes `profile`, `presentation`, and the actions from Task 3.
- Its controlled state serializes to the normalized draft JSON submitted by `savePresentationDraft`.

- [ ] **Step 1: Write the failing editor interaction test**

```tsx
it('restores Cover controls after switching through Minimal', async () => {
  render(<DigitalProfileEditor profile={profile} presentation={coverPresentation} />)
  await user.click(screen.getByRole('button', { name: /01 Minimal/i }))
  await user.click(screen.getByRole('button', { name: /02 Cover/i }))
  expect(screen.getByLabelText(/Darken background/i)).toHaveValue('0.38')
  expect(screen.getByRole('button', { name: /Lower left/i })).toHaveAttribute('aria-pressed', 'true')
})
```

- [ ] **Step 2: Run the editor test to verify it fails**

Run: `pnpm test src/app/dashboard/digital-profile/digital-profile-editor.test.tsx`

Expected: FAIL because the editor does not exist.

- [ ] **Step 3: Implement the smallest editor route and components**

Render template cards labelled `01 Minimal` and `02 Cover`; conditionally reveal visual Cover controls only for Cover; wire profile photo controls to the existing actions and cover controls to Task 3 actions; render the shared `PublicProfile` in an accessible phone frame; submit draft/publish actions; and add Dashboard links in setup and live owner surfaces.

- [ ] **Step 4: Run the editor tests to verify they pass**

Run: `pnpm test src/app/dashboard/digital-profile/digital-profile-editor.test.tsx src/app/dashboard/live-owner-center.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/app/dashboard/digital-profile src/app/dashboard/page.tsx src/app/dashboard/profile-editor.tsx src/app/dashboard/live-owner-center.tsx src/app/globals.css && git commit -m "feat: add Digital Profile editor"`

### Task 6: Verify the integrated feature

**Files:**
- Modify: any only if verification reveals a failure in Tasks 1–5.

**Interfaces:**
- Consumes all production interfaces above.
- Produces a verified build and responsive published/preview flows.

- [ ] **Step 1: Run the complete automated suite**

Run: `pnpm test && pnpm lint && pnpm build`

Expected: all commands exit 0.

- [ ] **Step 2: Verify responsive runtime behavior**

Run: `pnpm dev`

At iPhone 15-ish and smaller iPhone viewports, confirm: Cover wallpaper reaches content/footer; overlay/focal/alignment update in the phone preview; Minimal remains unchanged; Save Draft leaves public profile on published settings; Publish changes the public profile; and preview cannot download a contact.

- [ ] **Step 3: Fix only discovered integration defects and repeat affected tests**

Run: `pnpm test && pnpm lint && pnpm build`

Expected: all commands exit 0 after fixes.

- [ ] **Step 4: Commit verification fixes if any exist**

Run: `git add <verified-files> && git commit -m "fix: verify Cover digital profile integration"`
