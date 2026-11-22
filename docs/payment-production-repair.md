# Payment production repair

Prepared 22 November 2026. Production database repair completed with explicit user authorization; live payments remain disabled. The application-code release and Razorpay activation are still pending.

## Confirmed production gap

Read-only inspection of Supabase production `vscmmhpfuozyvangkmhq` returned null for both `public.paid_orders` and `public.paid_order_status_events`. The Orders page calls `listOrdersForOwner`, which queries `paid_orders` and throws on a database error. The payment source is already included in main; the production database has not received that setup.

The project defaults to the recovery Preview branch and sandbox. The user explicitly authorized the four reviewed production database migrations on 22 November 2026. They have now been applied; no production application deployment, environment change, or real payment was performed. The checkout sandbox was reported INACTIVE during inspection.

## 1. Apply only the reviewed order migrations

After explicit authorization for the production database repair, recheck the table and function inventory and take a current backup/checkpoint. Apply these repository SQL files in order, recording each successful migration. Do not replay the entire migrations directory: production has existing schema with incomplete historical baseline records.

1. `20261003091439_create_paid_orders.sql`
2. `20261011053000_add_payment_reconciliation.sql`
3. `20261011054500_qualify_payment_recovery_audit.sql`
4. `20261122154247_harden_paid_order_admin_helper.sql`

The first migration creates five order, payment, audit, and email tables plus server-only routines. The fourth closes inherited PUBLIC execution of the admin helper while preserving authenticated and server access. Run the security advisor again, verify RLS on all five tables, anonymous denial of payment RPCs, owner-only customer reads, and authenticated Orders rendering. This does not enable checkout or send emails.

Local schema rehearsal: `node scripts/verify-payment-database.mjs`. Uses PGlite with synthetic accounts, not customer records or a remote connection. Verifies migration execution, order/provider attachment, captured-payment recovery, duplicate protection, one email record, audit attribution, row isolation, and anonymous RPC denial. This is not a complete Supabase integration test.

## 2. Release the prepared payment code

Live mode now requires all of: production Vercel environment, live mode, a live-prefixed key, and the explicit `IQCARD_LIVE_PAYMENTS_APPROVED=true` gate. Preview and local environments reject live configuration. Existing previews retain test mode. No setting is changed merely by deploying this code.

Keep `IQCARD_COMMERCE_ENABLED=false` while preparing the production release. Production promotion requires explicit authorization under the repository rules.

## 3. Configure Razorpay and production variables securely

Owner confirms that the merchant account can accept live payments. Enter live credentials directly into Vercel's production environment; never put them in chat or source control. Use the same merchant account and Live Mode for credentials and the webhook.

| Variable | Production value |
| --- | --- |
| `IQCARD_COMMERCE_ENABLED` | `false` until acceptance prerequisites are complete |
| `IQCARD_COMMERCE_MODE` | `live` |
| `IQCARD_LIVE_PAYMENTS_APPROVED` | `true` only for the approved live release |
| `RAZORPAY_KEY_ID` | Owner-supplied live key ID |
| `RAZORPAY_KEY_SECRET` | Owner-supplied live secret |
| `RAZORPAY_WEBHOOK_SECRET` | Secret matching the live webhook |
| `IQCARD_SHIPPING_PAISE` | Confirmed shipping fee in paise |
| `IQCARD_TAX_PAISE` | Confirmed tax amount in paise |
| `NEXT_PUBLIC_SITE_URL` | `https://iqcard.in` |

Verify the Supabase URL and server-only service-role credential point to the same production project. Never copy sandbox credentials into production.

Configure the live webhook at `https://iqcard.in/api/payments/webhook` for `payment.captured` and `payment.failed`. Confirm Razorpay capture settings and webhook reachability/delivery. The application checks the raw-body HMAC signature and event ID, and validates the order amount and currency before marking an order paid. API recovery also verifies captured payment facts server-side.

Checkout and callback processing are separate: turning off new checkout leaves configured webhook processing available for payments already in progress. Do not revoke live approval/credentials while outstanding payment callbacks still need processing.

## 4. Complete customer-facing prerequisites

Confirm shipping amount, tax treatment, delivery regions and estimate, support contact, and policy pages before accepting orders. Transactional order email has separate sender/domain and environment configuration; keep it disabled until its delivery path is verified. A queued email record does not prove delivery.

## 5. Enable and verify a controlled purchase

After production schema verification and configuration, enable checkout and redeploy. The owner completes one explicitly authorized real payment. Verify the saved artwork, final amount, one paid order, callback/recovery status, confirmation email delivery, admin fulfillment queue, destination profile and tracking flow. Do not mark paid from a browser success screen alone.

Rollback of new purchases: set `IQCARD_COMMERCE_ENABLED=false` and redeploy, preserving callbacks, credentials and existing order data. Do not drop the order tables to roll back application code.

## Verification record

- Payment-focused suite before adding the schema rehearsal dependency: 86/86 passed. TypeScript passed; payment files passed lint.
- Full repository suite: 1130 passed, 4 failed. Failures concern the existing Rohan restoration/reservation expectations, image optimizer configuration expectations, and print preflight expectations; none exercise the modified payment files.
- Full lint is blocked by the existing synchronous state update in `AdminSidebar.tsx`.
- No hosted end-to-end or real-money validation has been completed in this repair.

Reference: [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps).

## Production database execution — 22 November 2026

The owner approved applying the four reviewed order migrations while keeping checkout disabled. A read-only preflight reconfirmed all five order tables and all order routines were absent. Existing helper ACLs and migration history were captured before applying DDL. Existing customer rows were not rewritten and no synthetic orders were inserted into production.

| Reviewed source file | Recorded production version | Result |
| --- | --- | --- |
| `20261003091439_create_paid_orders.sql` | `20261122155002` | Applied as `create_paid_orders` |
| `20261011053000_add_payment_reconciliation.sql` | `20261122155008` | Applied as `add_payment_reconciliation` |
| `20261011054500_qualify_payment_recovery_audit.sql` | `20261122155013` | Applied as `qualify_payment_recovery_audit` |
| `20261122154247_harden_paid_order_admin_helper.sql` | `20261122155018` | Applied as `harden_paid_order_admin_helper` |

The management tool assigned execution timestamps in migration history. These are the same reviewed SQL bodies under the names above; do not replay the source filenames as missing migrations merely because their timestamps differ.

Verified in production:

- All five tables exist and have RLS enabled. Anonymous SELECT and authenticated INSERT/UPDATE/DELETE are denied; server SELECT is available.
- All ten order/payment routines deny anonymous and authenticated execution and allow service-role execution. The admin helper denies anonymous execution while preserving authenticated and service access.
- Owner read policy is `owner_id = auth.uid()`; admin read policies remain present.
- No orders and no outbox messages exist after application: neither a payment nor an email was generated.
- Signed-in `https://iqcard.in/dashboard/orders` renders “Your cards, in motion.” and “No orders yet”, replacing the previous error. No console errors were observed in that check.
- `https://iqcard.in/dashboard/orders/checkout` renders delivery fields and explicitly says “Checkout is not enabled yet”; its submit button is disabled. No address was entered or submitted.
- Security advisor rerun: no new critical order exposure. Three new no-policy informational findings are intentional for server-only payment-attempt, payment-event and email-outbox tables, whose client access is revoked. Existing view/auth findings remain outside this repair. See [Supabase no-policy advisor](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Next: review/release the prepared live-payment code, confirm the merchant account, enter live secrets securely, configure the live webhook, settle pricing/policies and complete a controlled purchase. Those steps were not included in the database approval.
