# Live Owner Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the published IQ Card dashboard with the approved premium Live Owner Center while preserving the current draft setup flow and existing product systems.

**Architecture:** Keep `ProfileEditor` as the published-versus-draft boundary. Extract the published layout into a focused Owner Center component and use a typed saved-card view model to transform the existing registration/handoff customizer payload into an exact physical-card rendering.

**Tech Stack:** Next.js App Router, React, TypeScript, existing Supabase-backed profile and registration repositories, Vitest, CSS in `src/app/globals.css`.

**Spec:** `docs/superpowers/specs/2026-09-06-live-owner-center-design.md`

## Global Constraints

- Preserve authentication, Supabase data, routing, profile editing, Content Library, card customizer, and publishing logic.
- Render the Owner Center only when profile status is `published`; drafts retain setup.
- The physical card uses only saved customizer material, finish, engraved name, logo placement, NFC/design details, and supported custom color.
- Never substitute initials, a profile image, an avatar, sticker, generated name, or demo material for a card.
- Unsupported analytics, contacts, tap activity, and Spaces use explicit empty/coming-soon states, not fabricated owner data.
- Match the approved desktop and mobile hierarchy, spacing, and visual language.

---

### Task 1: Model saved customizer card data

**Files:** Create `src/lib/dashboard/saved-card.ts` and `src/lib/dashboard/saved-card.test.ts`.

**Interfaces:** Produce `SavedCardViewModel`, `parseSavedCardDesign(savedDesign)`, and `hasExactSavedCardDesign(card)`. Consume `{ design_id: string; payload: Record<string, unknown> } | null`.

- [ ] Write a failing parser test proving `{ configuration: { material: 'walnut', finish: 'matte', identity: { name: 'Ava Stone' }, logoPlacement: 'top-left' } }` produces `{ available: true, material: 'walnut', finish: 'matte', engravedName: 'Ava Stone', logoPlacement: 'top-left' }`, and `null` produces `{ available: false }`.
- [ ] Run `./node_modules/.bin/vitest run src/lib/dashboard/saved-card.test.ts`; expect failure because the parser does not exist.
- [ ] Implement the discriminated `SavedCardViewModel` and a defensive parser that reads only persisted customizer configuration fields.
- [ ] Run `./node_modules/.bin/vitest run src/lib/dashboard/saved-card.test.ts src/lib/dashboard/dashboard-v6.test.ts`; expect pass.
- [ ] Commit `src/lib/dashboard/saved-card.ts` and its test with message `feat: model saved customizer cards for dashboard`.

### Task 2: Build the exact physical-card renderer

**Files:** Create `src/app/dashboard/saved-card-renderer.tsx` and `src/app/dashboard/saved-card-renderer.test.ts`; modify `src/app/globals.css`.

**Interfaces:** Consume `SavedCardViewModel`. Produce `<SavedCardRenderer card={card} variant="hero" | "compact" />`.

- [ ] Write failing source-contract tests requiring `card.engravedName` and `card.logoPlacement`, forbidding `initials(` and `photoUrl`, and requiring the string `Saved card configuration unavailable`.
- [ ] Run `./node_modules/.bin/vitest run src/app/dashboard/saved-card-renderer.test.ts`; expect failure because the renderer does not exist.
- [ ] Implement the renderer: unavailable cards render only the unavailable state; available cards render the saved material/finish/custom color, saved logo placement, saved NFC/design label, and saved engraved name.
- [ ] Add hero and compact CSS render variants, plus material-specific surfaces that are driven only by the saved card model.
- [ ] Run `./node_modules/.bin/vitest run src/app/dashboard/saved-card-renderer.test.ts`; expect pass.
- [ ] Commit the renderer, test, and CSS with message `feat: render saved cards in owner center`.

### Task 3: Implement the published Live Owner Center

**Files:** Create `src/app/dashboard/live-owner-center.tsx` and `src/app/dashboard/live-owner-center.test.ts`; modify `src/app/dashboard/profile-editor.tsx` and `src/app/globals.css`.

**Interfaces:** Consume `Profile`, saved design data, `parseSavedCardDesign`, and `SavedCardRenderer`. Produce `<LiveOwnerCenter profile={profile} savedDesign={savedDesign} onEditDetails={...} />`.

- [ ] Write failing source-contract tests requiring `Good morning`, `profile.slug`, `profile.profile_links`, `SavedCardRenderer`, `No analytics yet`, and `Spaces are coming soon`; forbid the prototype strings `2,847` and `Priya Sharma`.
- [ ] Run `./node_modules/.bin/vitest run src/app/dashboard/live-owner-center.test.ts`; expect failure because the component does not exist.
- [ ] Build the approved sticky navigation, editorial hero, live status, public URL, identity panel, exact physical-card panel, real content/link module, share/copy controls, card-management drawer linking to `/customize`, and reference-matched desktop/mobile grids.
- [ ] Use honest empty modules for analytics, contacts, requests, tap activity, and Spaces; never render demo counts, trends, people, dates, or locations.
- [ ] Route only `mode === 'live'` to `LiveOwnerCenter`; retain `<SetupDashboard>` for every non-live state.
- [ ] Run `./node_modules/.bin/vitest run src/app/dashboard/live-owner-center.test.ts src/lib/dashboard/dashboard-v6.test.ts`; expect pass.
- [ ] Commit the component, test, editor integration, and CSS with message `feat: add premium live owner center`.

### Task 4: Complete responsive and accessible interactions

**Files:** Modify `src/app/dashboard/live-owner-center.test.ts`, `src/lib/dashboard/dashboard-v6.test.ts`, and `src/app/globals.css`.

**Interfaces:** Consume the published/draft mode boundary and Owner Center selectors. Produce protected mobile collapse and interaction behavior.

- [ ] Write failing assertions that the editor contains `mode === 'live'` and `<SetupDashboard`, and the stylesheet contains `.owner-center-grid`, `.owner-center-feature-grid`, and an `@media (max-width:720px)` layout override.
- [ ] Run `./node_modules/.bin/vitest run src/app/dashboard/live-owner-center.test.ts src/lib/dashboard/dashboard-v6.test.ts`; expect failure until the selectors and regression contract are complete.
- [ ] Ensure mobile uses a single-column feature/grid layout and horizontally scrollable navigation; ensure Escape and the labelled close button close the card drawer; announce copy feedback with `aria-live`.
- [ ] Run `./node_modules/.bin/vitest run src/app/dashboard/live-owner-center.test.ts src/lib/dashboard/dashboard-v6.test.ts`; expect pass.
- [ ] Commit the tests and CSS with message `test: protect owner center responsive modes`.

### Task 5: Full verification

**Files:** No source files expected.

- [ ] Run `./node_modules/.bin/vitest run`; expect all tests pass.
- [ ] Run `./node_modules/.bin/tsc --noEmit`, `./node_modules/.bin/eslint src`, and `./node_modules/.bin/next build`; expect clean TypeScript and production build with no new lint errors.
- [ ] Browser-check a published dashboard for hero, desktop/mobile grids, exact saved card, real profile links, copy/share feedback, and card drawer. Browser-check a draft account to confirm the setup editor remains active.

## Plan self-review

- Tasks 1–2 implement exact saved-card rendering; Task 3 recreates the approved Owner Center with real bindings; Task 4 protects mode isolation, responsive behavior, and accessibility; Task 5 verifies the complete feature.
- Saved-design types flow consistently from parser to renderer to Owner Center.
- The plan contains no fabricated owner data and does not alter authentication, the customizer, or publication systems.
