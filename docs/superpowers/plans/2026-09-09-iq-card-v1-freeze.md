# IQ Card V1 Freeze Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the open-ended Classic card configurator with the frozen, premium IQ Card V1 system.

**Architecture:** Centralize the V1 material catalogue and purchasability in the customizer contract, then have the static Atelier UI consume the same frozen data shape. Retain only identity, composition, reverse-side content, and review as user decisions; serialize fixed matte and laser-engraved manufacturing attributes.

**Tech Stack:** Next.js 16 App Router, TypeScript, static HTML/WebGL customizer, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-09-iq-card-v1-freeze-design.md`

## Global Constraints

- Exactly twelve selectable V1 materials, grouped Core, Seasonal Core, and Material Editions.
- The only production finish is matte and the only treatment is laser-engraved/recessed.
- IQ mark is fixed top-left; no logo upload or logo placement data is accepted.
- Next Release and Returning editions are visible but non-purchasable.
- Preserve desktop/mobile rendering, save/design handoff and checkout integration.

---

### Task 1: Define the frozen server contract

**Files:**
- Modify: `src/lib/customizer/card-configuration.ts`
- Modify: `src/lib/customizer/card-configuration.test.ts`

- [ ] **Step 1: Write failing contract tests**

```ts
expect(CARD_MATERIALS).toEqual(['White', 'Black', 'Graphite', 'Terracotta', 'Mustard', 'Oxblood', 'Walnut', 'Natural Oak', 'Travertine', 'Concrete', 'Ivory Marble', 'Oxidised Steel'])
expect(canonicalizeCardPayload(v1Payload({ material: 'Ebony' }))).toBeNull()
expect(canonicalizeCardPayload(v1Payload({ material: 'Natural Oak' }))).toBeNull()
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm test src/lib/customizer/card-configuration.test.ts`

- [ ] **Step 3: Implement the V1 schema**

Replace variable colour/core/craft/logo contract fields with surface, identity, composition, reverse layout and fixed `matte`/`laser-engraved` metadata. Derive price from a material price table only and reject unavailable edition materials.

- [ ] **Step 4: Run focused tests and confirm they pass**

Run: `pnpm test src/lib/customizer/card-configuration.test.ts`

### Task 2: Safely normalize saved V1 designs

**Files:**
- Modify: `public/customize/logo-persistence.mjs`
- Modify: `src/lib/customizer/logo-persistence.test.ts`

- [ ] **Step 1: Write failing migration tests**

```ts
expect(normalizeStoredConfiguration({ material: 'Walnut', identity: { name: 'Ada' } })).toMatchObject({ material: 'Walnut', finish: 'matte', craft: 'laser-engraved' })
expect(normalizeStoredConfiguration({ material: 'Leather' })).toBeNull()
```

- [ ] **Step 2: Run focused tests and confirm they fail**

Run: `pnpm test src/lib/customizer/logo-persistence.test.ts`

- [ ] **Step 3: Implement legacy-safe normalization**

Remove persisted custom-logo data and obsolete configuration controls. Default permitted legacy records to fixed production metadata and reject invalid/edition-unavailable materials.

- [ ] **Step 4: Run focused tests and confirm they pass**

Run: `pnpm test src/lib/customizer/logo-persistence.test.ts`

### Task 3: Rebuild the Atelier controls around V1

**Files:**
- Modify: `public/customize/index.html`
- Create: `public/customize/materials/`
- Modify: `src/lib/customizer/customizer-entry.test.ts`

- [ ] **Step 1: Write a document-level regression test**

```ts
expect(html).toContain('Material Editions')
expect(html).not.toMatch(/logoUpload|data-craft|finish selector|custom-color/i)
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `pnpm test src/lib/customizer/customizer-entry.test.ts`

- [ ] **Step 3: Implement the five-step UI and rendering data**

Extract the twelve supplied images into `public/customize/materials/`; replace the materials grid with editorial groups and edition status cards; remove core, finish, logo and craft panels/state/event handlers. Use a fixed logo drawing coordinate in all compositions and name fallback `Your Name`. Apply the approved source renders to the gallery/reference presentation and retain the responsive 3D preview.

- [ ] **Step 4: Run focused tests and confirm they pass**

Run: `pnpm test src/lib/customizer/customizer-entry.test.ts`

### Task 4: Preserve saved-card/dashboard semantics

**Files:**
- Modify: `src/lib/dashboard/saved-card.ts`
- Modify: `src/lib/dashboard/saved-card.test.ts`
- Modify: `src/app/dashboard/live-owner-center.tsx`

- [ ] **Step 1: Write the failing view-model test**

```ts
expect(parseSavedCardDesign(savedV1Design)).toMatchObject({ material: 'walnut', finish: 'Matte · laser engraved', logoPlacement: null })
```

- [ ] **Step 2: Run focused test and confirm it fails**

Run: `pnpm test src/lib/dashboard/saved-card.test.ts`

- [ ] **Step 3: Implement V1 saved-card display**

Surface the fixed production expression while removing custom-logo and placement reporting from dashboard UI.

- [ ] **Step 4: Run focused tests and confirm they pass**

Run: `pnpm test src/lib/dashboard/saved-card.test.ts`

### Task 5: Full verification

**Files:**
- Verify: `src/lib/customizer/*.test.ts`, `src/lib/dashboard/*.test.ts`, `public/customize/index.html`

- [ ] **Step 1: Run focused V1 test group**

Run: `pnpm test src/lib/customizer src/lib/dashboard`

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

- [ ] **Step 3: Run production build**

Run: `pnpm build`

- [ ] **Step 4: Manually inspect desktop and mobile customizer**

Run: `pnpm dev` and inspect `/customize` at desktop and mobile viewport widths.
