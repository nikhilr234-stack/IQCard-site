# IQ Card Paid Order V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe, recoverable India-only paid order flow for the ₹799 IQ Card, with test-only Razorpay payments and admin fulfillment.

**Architecture:** Keep pricing and checkout decisions on the server. Persist immutable card, contact, address, and price snapshots before creating a payment session; treat a verified provider webhook as the payment authority. Keep customer recovery, admin fulfillment, and transactional email on separate authenticated paths.

**Tech Stack:** Next.js App Router, TypeScript, Supabase Postgres/RLS, Razorpay test checkout, Vitest, PGlite verification.

**Spec:** IQCard Production Readiness plan supplied earlier in this conversation; detailed requirements are preserved in the active task summary.

## Global Constraints

- Keep the physical IQ Card line item at ₹799 across all material and craft options.
- Require explicit server-configured shipping and tax amounts; never accept client pricing as authoritative.
- Store an immutable order snapshot and a computed total in integer paise.
- Keep commerce disabled by default and reject live Razorpay credentials/mode.
- Only verified webhook events may mark an order paid; deduplicate provider events.
- Keep the production Supabase database unchanged until its migration is separately approved.
- Keep production deployment, merge, and live payment disabled.

## Review Focus

- Repeated requests after a lost response must reuse the exact persisted order/address/charges.
- Concurrent requests must not create multiple provider orders for one IQ Card order.
- Forged, duplicate, wrong-currency, or wrong-amount webhook events must not mark an order paid.
- Refund state must not permit unshipped orders to enter shipment/production improperly.
- Customer reads and admin writes must remain isolated by owner/admin policy.

---

### Task 1: Order schema and repository

**Files:**
- Create: `supabase/migrations/20261003091439_create_paid_orders.sql`
- Create: `src/lib/orders/paid-orders-migration.test.ts`
- Create: `src/lib/orders/repository.ts`
- Create: `src/lib/orders/repository.test.ts`

- [ ] Write migration contract and repository tests for owner isolation, immutable snapshots, idempotency, and service-only writes.
- [ ] Run tests and confirm the expected failures.
- [ ] Implement orders, attempts, provider events, audit events, email outbox, RLS, and restricted RPCs.
- [ ] Run migration tests and isolated Postgres checks.

### Task 2: Pricing and checkout configuration

**Files:**
- Create: `src/lib/orders/pricing.ts` and tests.
- Create: `src/lib/orders/checkout-config.ts` and tests.
- Modify: `src/lib/customizer/card-configuration.ts` and `public/customize/index.html`.

- [ ] Add failing tests for flat ₹799 pricing, invalid shipping/tax, and sandbox-only environment gates.
- [ ] Implement canonical server-side pricing and explicit test-mode checkout configuration.
- [ ] Verify client-provided price fields are ignored.

### Task 3: Checkout service and payment webhook

**Files:**
- Create: `src/lib/orders/razorpay.ts` and tests.
- Create: `src/lib/orders/checkout-validation.ts` and tests.
- Create: `src/lib/orders/checkout-service.ts` and tests.
- Create: `src/app/api/orders/route.ts` and tests.
- Create: `src/app/api/payments/webhook/route.ts` and tests.

- [ ] Test authenticated saved-design checkout, key conflicts, retry recovery, and provider creation races.
- [ ] Implement provider-order reservation/attachment, server-side order totals, and recoverable provider sessions.
- [ ] Test raw-body signature verification, duplicate events, amount/currency mismatch, and failure events.
- [ ] Implement the sandbox-gated webhook path and transactional event processing.

### Task 4: Customer checkout recovery and confirmation

**Files:**
- Create: `src/app/dashboard/orders/checkout/page.tsx` and tests.
- Create: `src/app/dashboard/orders/checkout/checkout-form.tsx` and tests.
- Create: `src/app/api/orders/[orderId]/route.ts` and tests.
- Create: `src/app/dashboard/orders/[orderId]/page.tsx` and tests.
- Create: `src/app/dashboard/orders/[orderId]/profile-destination.tsx` and status UI.

- [ ] Test that resumed checkout restores saved card, address, contact, and itemized amounts after a lost response.
- [ ] Test payment polling and login redirect preservation.
- [ ] Implement accessible, responsive form/review and order status/confirmation pages.

### Task 5: Admin fulfillment and email outbox

**Files:**
- Create admin order list/detail UI and action route with tests.
- Create email templates, delivery adapter, outbox cron route, and tests.
- Modify admin navigation.

- [ ] Test admin-only reads/writes, audit events, refund and shipment state rules.
- [ ] Test email outbox retries and disabled-by-default sender behavior.
- [ ] Implement audited fulfillment and protected scheduled email dispatch.

### Task 6: Verification and release gates

- [ ] Run the complete Vitest suite, ESLint, TypeScript, migration checks, and production build.
- [ ] Review the complete branch diff and remove generated artifacts or personal test data.
- [ ] Request an independent final code review and resolve findings.
- [ ] Push the feature branch and open a draft PR; inspect its Vercel preview.
- [ ] Keep the migration unapplied in production and document the outstanding business/provider inputs.
