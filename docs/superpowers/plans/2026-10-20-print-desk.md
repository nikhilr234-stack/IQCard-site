# IQ Card Print Desk Implementation Plan

**Goal:** Export exact saved Atelier front/back artwork at the user-confirmed 85.6 × 54 mm card size.
**Architecture:** A verified-admin page and read-only API select exact database records. An Atelier print mode shares shader/decal functions; browser modules generate PNG/JPEG/PDF/ZIP with physical-size metadata.
**Tech Stack:** Next.js 16, existing Supabase access patterns, WebGL2, Canvas2D, browser binary files; no new production dependency.
**Spec:** docs/superpowers/specs/2026-10-20-print-desk-design.md

## Global constraints
Recovery branch and Preview only; no database mutation; no design fallback; preserve original saved placement; provisional bleed/inset/radius clearly disclosed; physical proof required.

## Review focus
- Invalid or unavailable payloads must fail closed rather than render defaults.
- Raster DPI and PDF millimetres must agree within pixel rounding.
- Art clipped by trim must prevent export; safe-area warnings never change layout.
- Font/asset failures must be visible and exports cannot drop custom logos.
- Older edits must not change an already selected immutable order snapshot.

## Task 1: Read-only admin sources
- [x] Write API tests for signed out, client, verified admin, invalid source and missing record; run RED.
- [x] Implement src/lib/print/repository.ts and src/app/api/admin/print-design/route.ts.
- [x] Implement admin list/detail navigation without sending all payloads to the client.
- [x] Run targeted tests and typecheck.

## Task 2: Exact-size export files
- [x] Write tests for 85.6 × 54 geometry, inset/bleed bounds, PNG/JPEG DPI, PDF boxes, ZIP CRC/index; run RED.
- [x] Implement public/customize/print-files.mjs and tests at src/lib/print/files.test.ts.
- [x] Parse generated PDF/image/archive with independent tooling.

## Task 3: Shared Atelier renderer and print controls
- [x] Add print-only read-only entry, preserving ordinary resume/preview tests.
- [x] Add offscreen shader mode without changing normal lighting, plus high-resolution copies of existing decal canvases.
- [x] Build print desk module/CSS: dimensions, both side proofs, preflight, exports and manifest.
- [x] Test all variants, clipping, logos, no localStorage mutation; inspect desktop/mobile.

## Task 4: Verify and deliver
- [x] Full Vitest suite, lint, typecheck, production build, diff check.
- [x] Review diff and record remaining physical/font limitations.
- [ ] Commit and push recovery branch; confirm iqcard-app Preview deployment when available.
