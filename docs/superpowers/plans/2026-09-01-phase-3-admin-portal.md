# Phase 3 Admin Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authorized administrator onboard and manage individual client profiles from one protected portal.

**Architecture:** Admin Server Actions verify the current account is an admin before using the Supabase service-role client. Invitations are sent through Supabase Auth; the existing auth trigger creates the account row, then the action creates a draft profile. The admin page renders a server-side client list and submits simple forms for onboarding, resending access, and changing publication status.

**Tech Stack:** Next.js 16 App Router, Supabase Auth/Admin API/Postgres, TypeScript, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-phase-1-foundation-design.md` plus the approved Phase 3 requirements in chat.

## Global Constraints

- Every admin action calls `requireAdminAccount` before any service-role operation.
- One auth user maps to one `user_accounts` row and one `profiles` row.
- Invitations use magic-link email; passwords are never collected or stored.
- Client profile content remains draft until explicitly published.

---

### Task 1: Admin input validation and repository

**Files:**
- Create: `src/lib/admin/validation.ts`
- Create: `src/lib/admin/validation.test.ts`
- Create: `src/lib/admin/repository.ts`

**Interfaces:**
- `validateClientEmail(value)` returns a normalized email or an error.
- `listAdminClients()` returns clients with profile status and slug.
- `makeAvailableSlug(base, taken)` returns a deterministic unique slug.

### Task 2: Onboarding and management Server Actions

**Files:**
- Create: `src/app/actions/admin.ts`

**Interfaces:**
- `onboardClient(formData)` invites a new email and creates a draft profile.
- `resendClientInvite(formData)` sends a fresh magic-link invitation.
- `setClientPublication(formData)` publishes or unpublishes a target profile.

### Task 3: Admin portal UI

**Files:**
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Admin sees onboarding form, client table, profile URL/status, and management actions.
- Non-admin users remain blocked by `requireAdminAccount`.

### Task 4: Verify admin workflows

**Files:**
- Modify: `README.md`

- [ ] Run tests, lint, TypeScript, and production build.
- [ ] Browser-test admin access and the client table without sending a real invitation unless explicitly confirmed.
- [ ] Document the invitation and Supabase Auth redirect prerequisites.
