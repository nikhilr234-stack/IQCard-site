# IQ Card Mobile Customizer Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an iPhone-first `/customize` experience below 768px that keeps the existing card renderer and production flow while leaving desktop Classic Atelier unchanged.

**Architecture:** Keep `public/customize/index.html` as the single runtime and add a small pure mobile-inspection helper for transient drag poses. Scope the new layout under the mobile media query, branch only view behavior for mobile, and reuse the existing `configuration`, renderer, autosave, validation, final summary, and email handoff elements and handlers.

**Tech Stack:** Static HTML/CSS/JavaScript, WebGL2 PBR renderer, browser `PointerEvent` APIs, Vitest, Next.js 16 static rewrite.

**Spec:** `docs/superpowers/specs/2026-09-08-mobile-customizer-integration-design.md`

## Global Constraints

- Mobile breakpoint is approximately `max-width: 768px`.
- Desktop Classic Atelier composition, scroll inspection, final overlay mode, and checkout actions remain unchanged.
- Do not duplicate configuration state, renderer, materials, custom colors, validation, autosave, saved design, checkout, or magic-link systems.
- Preserve the production step sequence: `core`, `material`, `identity`, `logo`, `craft`, `final`.
- Keep the IQ mark production contract; do not add prototype-only IQ removal or reset behavior.
- Mobile must have one vertical scroller, no horizontal page overflow, direct card drag, persistent card visibility, and safe-area-aware bottom navigation.

### Task 1: Add and test the pure mobile inspection pose helper

**Files:**
- Create: `public/customize/mobile-inspection.mjs`
- Create: `src/lib/customizer/mobile-inspection.test.ts`

**Interfaces:**
- `mobileInspectionPose(input: { baseX: number; baseY: number; startX: number; startY: number; currentX: number; currentY: number }): { x: number; y: number }`
- `clampMobileAngle(value: number, min: number, max: number): number`
- `snapMobilePose(pose: { x: number; y: number }): { x: number; y: number }`

- [ ] **Step 1: Write failing tests** for horizontal drag changing Y, vertical drag changing X, angle clamping, and near-front snap.
- [ ] **Step 2: Run the focused test and verify it fails** because the helper does not exist.
- [ ] **Step 3: Implement the minimal pure helper** with the prototype’s drag sensitivity and stable angle bounds; do not include DOM or configuration state.
- [ ] **Step 4: Run the focused test and verify it passes.**

### Task 2: Add mobile-only layout structure and touch-first styling

**Files:**
- Modify: `public/customize/index.html` CSS block around the existing media queries and stage/control rules
- Modify: `src/lib/customizer/customizer-entry.test.ts`
- Modify: `src/lib/customizer/custom-colors.test.ts` only if a new stable mobile hook needs contract coverage

**Interfaces:**
- Consumes existing `.topbar`, `.hero`, `.atelier-shell`, `.stage-wrap`, `.scroll-track`, `.scroll-space`, `.sticky-stage`, `.controls`, `.panel`, `.material-grid`, `.custom-color-grid`, `.control-foot`, `#commercialPanel`, and `#orderReviewPanel` elements.
- Produces stable mobile selectors/data attributes for stage hit area, mobile final host, and mobile order-review host without adding a second configuration UI.

- [ ] **Step 1: Add failing source-contract assertions** for the 768px mobile breakpoint, hidden hero/story, non-scrolling mobile inspection surface, mobile drag hook, horizontal snap rows, safe-area bottom bar, and final/order panel mount hooks.
- [ ] **Step 2: Run the focused source tests and verify the expected failures.**
- [ ] **Step 3: Add the mobile CSS**: hide hero/story, collapse the atelier to one column, make the top bar and stage sticky, remove nested inspection scrolling, set card-stage sizing for short/tall phones, add touch target minimums, style snap rows, preserve safe-area bottom padding, and keep final/order panels below the stage on mobile.
- [ ] **Step 4: Add only the minimal mobile host markers/attributes** needed to move existing final/order elements without cloning their markup or handlers.
- [ ] **Step 5: Run focused tests and inspect the generated source for accidental desktop selector changes.**

### Task 3: Wire mobile drag rotation into the existing renderer

**Files:**
- Modify: `public/customize/index.html` module script imports and inspection functions near `STEP_POSES`, `focusStepPose`, `updateScene`, and renderer initialization
- Modify: `src/lib/customizer/customizer-entry.test.ts`

**Interfaces:**
- Consumes `mobileInspectionPose`, `snapMobilePose`, existing `STEP_POSES`, `renderCard`, `window.__iqPBR.setPose`, and existing `cardRig`/`stickyStage` elements.
- Produces mobile-only pointer capture behavior with transient `mobilePose` state; desktop scroll choreography remains the default branch.

- [ ] **Step 1: Add failing source-contract assertions** requiring a mobile branch, `pointerdown`/`pointermove`/`pointerup`/`pointercancel`, pointer capture, the pure helper import, and calls to the existing PBR `setPose`.
- [ ] **Step 2: Run the focused source test and verify failure.**
- [ ] **Step 3: Implement mobile pose initialization** from the existing step pose without changing `configuration` or saved payloads.
- [ ] **Step 4: Implement card-only pointer drag** with clamping, snap-on-release, CSS fallback transform, and PBR pose updates; prevent browser scrolling only while the pointer is captured on the card.
- [ ] **Step 5: Branch `focusStepPose` and `updateScene` by mobile media state** so desktop keeps its current scroll behavior while mobile does not depend on `scrollTrack.scrollTop`.
- [ ] **Step 6: Run focused tests and manually inspect the mobile source branch for desktop fallthrough regressions.**

### Task 4: Reuse final summary/order-review elements in the mobile control flow

**Files:**
- Modify: `public/customize/index.html` final-mode functions and event wiring
- Modify: `src/lib/customizer/customizer-entry.test.ts`

**Interfaces:**
- Consumes existing `setFinalMode`, `openOrderReview`, `closeOrderReview`, `renderCommercialSummary`, `saveCurrentDesign`, and the existing `#commercialPanel`/`#orderReviewPanel` nodes.
- Produces a reversible mobile layout adapter that mounts the existing nodes into the Final control panel and restores their desktop anchors above 768px.

- [ ] **Step 1: Add failing source assertions** for mobile final mode preserving controls/card visibility and reusing the existing summary/order nodes.
- [ ] **Step 2: Run the focused test and verify failure.**
- [ ] **Step 3: Implement a `matchMedia('(max-width: 768px)')` layout adapter** with original anchor placeholders, reversible moves, and no configuration mutation on resize.
- [ ] **Step 4: Update `setFinalMode` so desktop behavior is unchanged while mobile keeps the card stage and exposes the final panel below it.**
- [ ] **Step 5: Keep the existing Save this design → Continue → email Confirm build sequence and live validation messages intact.**
- [ ] **Step 6: Run focused tests and verify the existing checkout/auth tests remain green.**

### Task 5: Full automated verification and responsive browser checks

**Files:**
- Modify: `src/lib/customizer/mobile-inspection.test.ts` only if verification reveals a pure pose defect
- Modify: `src/lib/customizer/customizer-entry.test.ts` only for observed contract gaps

- [ ] **Step 1: Run the full Vitest suite.**
- [ ] **Step 2: Run ESLint and the production Next.js build.**
- [ ] **Step 3: Start the local app and inspect `/customize` at 360×800, 390×844, 393×852, and 430×932.**
- [ ] **Step 4: Verify no horizontal overflow, no nested vertical scroll container, visible card/control relationship, direct drag rotation, horizontal material/color rows, and visible bottom actions at every mobile viewport.**
- [ ] **Step 5: Inspect `/customize` around 1440×900 and confirm desktop scroll inspection, controls, final overlay, and order review are unchanged.**
- [ ] **Step 6: Verify the final flow through local save, validation, and the existing email handoff request without sending a real email.**

### Task 6: Deploy the verified mobile customizer

**Files:**
- No additional source files; deploy the verified workspace.

- [ ] **Step 1: Confirm the local test, lint, build, and responsive checks are all green.**
- [ ] **Step 2: Deploy production to the linked Vercel project using the authorized team scope.**
- [ ] **Step 3: Verify the live `/customize` page contains the mobile hooks and that the production deployment is READY.**
- [ ] **Step 4: Report the production URL and deployment inspection link.**
