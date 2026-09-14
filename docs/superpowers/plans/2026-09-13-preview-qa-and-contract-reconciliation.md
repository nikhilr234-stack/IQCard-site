# Preview QA and Contract Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete responsive visual QA, reconcile obsolete customizer tests with the approved six-step design, and verify auth/checkout handoff without external side effects.

**Architecture:** Keep the approved static customizer and Next.js infrastructure unchanged. Treat the browser payload as untrusted input, canonicalize all approved configuration metadata server-side, and test the handoff route through mocks instead of live Supabase/email/payment services.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Node test runner, in-app browser.

**Spec:** `IQCard-Approved-Codex-Handoff/CODEX-INSTRUCTIONS.md` from the supplied handoff archive.

## Global Constraints

- Preserve the approved visual design and six steps: `core`, `material`, `identity`, `logo`, `craft`, `final`.
- Black core derives black lettering (`dark`); white core derives white lettering (`light`).
- Preserve all twelve approved materials and provisional server-authoritative INR pricing.
- Do not send email, charge payment, mutate customer data, publish, or deploy.

### Task 1: Reconcile approved UI contracts

**Files:** Modify `src/lib/customizer/v1-freeze.test.ts` and `src/lib/customizer/customizer-entry.test.ts`.

- [x] Replace obsolete five-step, unavailable-material, and no-logo/craft assertions with the approved frozen contract.
- [x] Run the two suites and confirm failures are limited to missing intended behavior.

### Task 2: Restore payload preservation and validation

**Files:** Modify `src/lib/customizer/card-configuration.test.ts` and `src/lib/customizer/card-configuration.ts`.

- [x] Update material cases to the twelve approved entries and add core-derived tone coverage.
- [x] Run the suite red against the incomplete canonicalizer.
- [x] Canonicalize core, custom colour, bounded fine-tune values, logo, craft, and back layout; rebuild pricing/manufacturing server-side.
- [x] Run the suite green.

### Task 3: Verify responsive UI and safe handoff

**Files:** No production mutation expected; use existing browser and route tests.

- [x] Verify 390×844 and 768px layouts with no horizontal overflow, error overlays, or console errors.
- [x] Run checkout route, auth callback/confirm, registration, dashboard saved-card, and handoff tests with mocks/fixtures.
- [x] Verify full Vitest, lint, TypeScript, production build, and targeted Node regression.
- [x] Leave local preview tabs open and report any genuine blockers.
