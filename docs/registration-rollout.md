# Registration v2 rollout

The new registration and onboarding system is opt-in. Deploy the application with `IQCARD_ONBOARDING_V2=false` first; the guest customizer will continue using the legacy `checkout_handoffs` path.

## Prerequisites

- Apply every unapplied Supabase migration in this exact filename order: `202608300001_create_user_accounts`, `202608300002_create_profiles`, `202609050001_create_checkout_handoffs`, `202609050002_create_registration_intents`, `202609050003_create_onboarding_progress`, `202609050004_add_onboarding_profile_fields`, `202609050005_create_registration_rate_limits`, `202609060001_fix_claim_registration_intent_status_ambiguity`, `202609060002_secure_profiles_and_atomic_writes`, `202609080001_harden_publication_boundary`, `202609080002_close_publication_boundary_bypasses`, and `20261005085331_require_admin_profile_approval`. The two `20260908` migrations are mandatory additive security hardening migrations; `202609060002` alone is not sufficient. The October approval migration keeps customer profiles private until an administrator publishes them. Do not enable registration v2 or run the legacy importer before the final migration succeeds.
- Configure a random, server-only `IQCARD_RATE_LIMIT_SECRET` containing at least 32 random bytes.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
- Set the Supabase production Site URL to `https://iqcard.in`.
- Allow `https://iqcard.in/auth/confirm`, `https://iqcard.in/auth/callback`, and their `http://localhost:3000` equivalents.
- Configure custom SMTP with a verified sending domain, SPF, DKIM, and DMARC.
- Use the direct token-hash magic-link template documented in `supabase/README.md`; retain code exchange as fallback.

## Data compatibility and backfill

- Migration `202609060002` performs the legacy contact-visibility backfill once, in the same transaction that records its completion marker. At migration application it enables email or phone visibility for every already-published profile whose corresponding historical field is non-empty. Drafts, blank fields, WhatsApp, and location remain private; the persistent marker means rerunning migrations cannot re-enable a later user opt-out.
- A saved custom logo is restorable only when it contains a supported PNG, JPEG, WebP, or SVG data URL within the size limit and a filename. Older metadata-only custom-logo records cannot pretend that an image still exists: the customizer falls back to the IQ logo, and checkout from an unconverted custom payload requires the user to re-upload the image. Browser-only object URLs are never treated as durable data.

## Legacy profile import

Run the importer only after all schema and policy migrations have completed. Its default mode is read-only.

1. Inventory every record with `npm run migrate:legacy -- --dry-run --json`.
2. Provision the reported pending Auth accounts and manually resolve every owner or slug conflict. A published profile, a different slug already owned by the account, or the desired slug owned by another account remains a hard conflict.
3. Import one verified record at a time with `npm run migrate:legacy -- --import --slug teju --json`, then inspect the private draft before moving to the next record.
4. If a run is interrupted, retry the same command: `npm run migrate:legacy -- --import --slug teju --json`. A same-owner, same-slug draft is resumed; links are replaced instead of appended; and the photo is upserted at the deterministic `<owner-id>/legacy/<filename>` path before that returned path is saved as `photo_path`. Retrying after profile, link, upload, or profile-update success therefore converges without duplicate links or Storage objects.

Keep imported profiles in `draft` until their text, contact visibility, links, and photo have been reviewed. Do not use the retry behavior to overwrite a published profile or bypass a reported conflict.

## Staged release

1. Apply the additive schema migrations and confirm the one-time visibility backfill completed.
2. Deploy the application with the feature flag disabled.
3. Smoke-test `/customize`, legacy email confirmation, `/login`, and existing dashboards.
4. Enable `IQCARD_ONBOARDING_V2=true` in a preview environment.
5. With a dedicated test mailbox, complete design → email → confirmation → every onboarding step → private draft → publish.
6. Repeat with the email opened in another browser, an expired link, a replayed link, and a mismatched signed-in address.
7. Confirm a stopped wizard resumes at the first incomplete step on another device.
8. Enable production and monitor `registration_intent_created`, `registration_email_sent`, `registration_email_failed`, `registration_claimed`, `registration_claim_failed`, `registration_rate_limited`, `onboarding_step_saved`, and `onboarding_completed`.

## Rollback

Set `IQCARD_ONBOARDING_V2=false` and redeploy. New customizer requests immediately return to `checkout_handoffs`, and existing users continue to the legacy dashboard. Do not reverse the additive migrations; retained v2 records are private and allow investigation or a later re-enable.

## Current verification boundary

Unit, route, validation, type, lint, production-build, and public browser smoke tests run locally. A real-mailbox end-to-end run requires the migrations and environment variables in a preview Supabase/Vercel environment and must happen only after deployment authorization.
