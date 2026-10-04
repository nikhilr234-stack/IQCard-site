# Paid Order V1 Release Gates

Status as of 3 October 2026: implementation is on a feature branch for review. The production Supabase project has not received this migration. Checkout and transactional email are disabled by default. Live payment mode is rejected by the application.

## Before enabling the sandbox on a preview

- Apply the reviewed order migration to a disposable or dedicated test Supabase project first, then run the complete sandbox purchase and fulfillment path.
- Set these values in the **Preview** environment only: `IQCARD_COMMERCE_ENABLED=true`, `IQCARD_COMMERCE_MODE=test`, `RAZORPAY_KEY_ID` beginning with `rzp_test_`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `IQCARD_SHIPPING_PAISE`, and `IQCARD_TAX_PAISE`.
- Keep shipping and tax values explicit, even when a charge is zero. Confirm the expected amounts before testing because the order total is ₹799 plus those configured amounts.
- Use only Razorpay test credentials. The checkout code refuses live keys and refuses to start checkout when `VERCEL_ENV=production`.
- Keep `IQCARD_ORDER_EMAILS_ENABLED` unset until an approved sender domain and test email path are ready. Email requires `RESEND_API_KEY`, `IQCARD_ORDER_EMAIL_FROM`, and `NEXT_PUBLIC_SITE_URL`; sign-in email remains separate.
- Vercel Cron runs only against production deployments, not previews. The manual cron endpoint can be tested in preview with `CRON_SECRET`; immediate delivery after payment or shipment requires the approved test sender and Resend test key. After a production release is separately approved, configure the production `CRON_SECRET` so the daily outbox retry can run. Keep `IQCARD_ORDER_EMAILS_ENABLED` unset until sender approval.

## Business decisions required before a live launch

- Approve whether GST is included in ₹799 and supply the tax treatment and customer-facing tax wording.
- Set the shipping amount and supported delivery coverage. V1 validation accepts India addresses only.
- Approve a truthful delivery estimate, plus Privacy, Terms, Shipping/Delivery, Cancellation, and Refund wording.
- Supply the customer support contact and assign an operations owner for production, NFC encoding, packing, dispatch, and customer questions.
- Confirm the profile lifecycle for a physical card: V1 points NFC to the account's public profile URL, and unpublishing that profile makes the destination unavailable. The customer and operations owner should understand this before the card is encoded.
- Confirm the live Razorpay merchant account, webhook setup, and live-key onboarding. Live checkout remains unsupported and blocked until a separately reviewed change removes the production restriction.
- Approve an email sender domain and operational ownership for failed email retries.

## Database and security review

- The new migration remains unapplied in the production project. It grants order RPC execution only to `service_role`, allows customer reads only for their own orders, and uses the existing admin check for queue reads. Payment, fulfillment, profile-confirmation, and email outbox writes are server-side.
- The 3 October 2026 Supabase security-advisor run reported existing findings. The published profile presentation view is intentionally public and filters to published profiles; review its `SECURITY INVOKER` migration path separately because it currently reads public presentation data through a security-definer view. Remediation reference: [Supabase database linter 0010](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view).
- The order migration revokes anonymous execution of `is_current_user_admin()` while retaining authenticated execution for RLS, and revokes client execution of the trigger-only `handle_new_user()` and `enforce_published_profile_validity()` functions. Anonymous execution of `is_published_profile_cover(text)` remains required by the public profile-cover storage policy; the helper returns only whether a requested path belongs to a published profile.
- Existing authenticated security-definer profile and onboarding actions remain available to the app. The advisor flags them for a grant and owner-check review; this change does not alter those established flows.
- Existing RLS-enabled tables with no policies are fail-closed for client access and used through server-side code. The production advisor also reports existing password leak protection, RLS call-plan, multiple-policy, missing-index, and unused-index findings. Review those in a separate database-hardening change. The new order profile and audit actor foreign keys are indexed.
- The security advisor runs against production, so it does not validate this unapplied migration. The migration was executed against a disposable PGlite Postgres database, including role-grant checks and payment, profile confirmation, fulfillment, tracking, refunds, email outbox retries, and audit history.

## Manual sandbox acceptance run

1. Save a customizer design and complete the verified-email handoff.
2. Submit a valid India delivery address and check the ₹799 subtotal and explicit shipping/tax total.
3. Confirm one sandbox payment and verify that only the signed webhook marks the order paid; replay the same event and confirm no duplicate transition or email.
4. Publish the account's digital profile, confirm it as the NFC destination, and verify that production is blocked until this step.
5. As an admin, start production, enter carrier and tracking details, then mark delivered. Confirm the order history at each applicable state. Test email delivery in preview only after configuring the approved test sender and Resend test key.
6. Repeat with an invalid address, failed payment, closed payment window, delayed webhook, email provider failure, and retry.

Do not apply the migration to production, enable production checkout, or promise delivery dates until the open decisions above are approved.

## Preview configuration follow-up — 4 October 2026

- Reproduced HTTP 500 on the launch preview's actual checkout route, `/dashboard/orders/checkout`, before authentication could complete.
- Confirmed that all existing project application environment variables targeted production only. The preview therefore lacked the public site URL and Supabase client configuration.
- Added branch-specific Preview values for `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The site URL uses the stable launch-branch alias. Only public Supabase client configuration is reused for route/authentication checks; no production service-role key is copied.
- Explicitly set branch-specific `IQCARD_COMMERCE_ENABLED=false`. No payment or fulfillment writes are enabled by this configuration update.
- This commit triggers a fresh preview build so the configuration can take effect. Verify the actual checkout route redirects to sign-in without HTTP 500, and verify the public customizer and policy routes after the deployment is Ready.
- The checkout sandbox still requires a dedicated test Supabase project, the reviewed order migration, Razorpay test credentials and webhook setup, explicit shipping/tax amounts, and an approved transactional-email test sender. Replace the preview public Supabase configuration with that test project's values before enabling commerce.
- Production launch remains blocked on a successful deployed sandbox purchase-to-fulfillment run and the business decisions listed above. The production database and production environment have not been changed by this follow-up.

## Isolated database setup — 4 October 2026

- Created healthy free-tier project `iqcard-checkout-sandbox` (`zlmiiyuhuqmmrfcpzsxe`) in Mumbai.
- Applied all 26 repository migrations in order to the sandbox only. A fresh replay required dropping `complete_own_onboarding_publish(boolean)` before the 8 September migration changes its return type from void to text. Production was not changed.
- Verified RLS is enabled on all five paid-order tables and that anonymous callers cannot execute the payment-event RPC while service_role can.
- The admin-helper revoke in the paid-order migration left inherited PUBLIC execution available. Applied a sandbox-only corrective grant change revoking PUBLIC/anon while retaining authenticated/service_role execution. Verified anonymous execution is now false. These fresh-install and grant corrections need repository migration coverage before live release.
- Changed launch-branch Preview public Supabase URL/key to the sandbox. Razorpay and the sandbox service-role variable have been supplied by the owner; values remain secret. This document does not attest that the supplied secret values are correct.
- Configured test mode, shipping=0 and tax=0 as sandbox fixtures only. Commerce remains disabled pending authentication redirect and webhook reachability setup.
- Remaining setup: sandbox Auth Site URL and callback allowlist, Vercel-protected webhook access, deployed service-role/payment credential checks, then full sandbox purchase and fulfillment verification. Transactional email setup and approved policy content remain outstanding.
