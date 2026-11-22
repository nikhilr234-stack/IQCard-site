# Cover Viewer Proportions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct the default Cover mobile viewer's visual proportions without affecting any user-selected variants.

**Architecture:** Retain `CoverProfile` markup and use narrowly scoped mobile CSS for the Editorial Left variant and its dashboard phone preview. Existing component tests confirm renderer behavior; visual layout is verified through a deployment preview.

**Tech Stack:** Next.js, React, TypeScript, global CSS, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-29-cover-viewer-proportions-design.md`

### Task 1: Recompose the default mobile Cover viewer

**Files:**
- Modify: `src/app/globals.css`
- Test: `src/components/cover-profile.test.tsx`, `src/components/profile-templates.test.tsx`

- [ ] Scope mobile Editorial Left rules to a controlled upper-third identity stack, tightening only the vertical gaps after identity, action, and links.
- [ ] Mirror the exact default composition in the dashboard phone preview.
- [ ] Verify focused template tests, full tests, lint, typecheck, and production build.
- [ ] Commit the change.
