# Payment production repair

Prepared 22 November 2026. This is a proposed release, not an activation record.

## Confirmed production gap

Read-only inspection of Supabase production `vscmmhpfuozyvangkmhq` returned null for both `public.paid_orders` and `public.paid_order_status_events`. The Orders page calls `listOrdersForOwner`, which queries `paid_orders` and throws on a database error. The payment source is already included in main; the production database has not received that setup.

The project currently restricts writes to the recovery Preview branch and sandbox. No production migration, deployment, settings change, or real payment has been performed for this repair. The checkout sandbox was reported INACTIVE during inspection. Local verification does not establish hosted readiness.

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
