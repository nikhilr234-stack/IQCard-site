# Complete Site Repair Design

## Purpose

Repair every confirmed defect from the 2026-09-06 site audit without changing the intended product flow. The work must close the image-privacy exposure, remove client authority over commercial data, prevent partial database writes, restore broken dashboard/customizer behavior, and add regression coverage for each repair.

## Scope and priorities

The implementation is divided into four independently verifiable batches. Security and irreversible data-integrity risks are repaired first, followed by user-facing correctness and operational cleanup. Existing production records and URLs must remain valid.

### 1. Security and route authorization

- Replace the broad `profile-images` Storage SELECT policy. Anonymous reads must only succeed for an object referenced by a published profile. Authenticated owners and administrators retain the access needed to manage their own images.
- Protect `/dashboard` and every nested dashboard route in `proxy.ts`.
- Stop treating a cookie name as proof of authentication. The proxy may perform optimistic redirects only after Supabase has returned a verified user; every protected page and data operation must continue to enforce authorization server-side.
- Replace the unsupported `forbidden()` path with a stable, explicit non-admin response unless the application deliberately enables and tests Next.js auth interrupts. The repair will favor stable behavior over an experimental flag.
- Preserve the current login redirect contract, including a safe relative `next` destination.

### 2. Authoritative validation and atomic writes

- Define a strict server-side schema for submitted card selections. Only supported user-selectable values may enter the registration payload.
- Recompute price totals and manufacturing output on the server from those selections. Client-supplied totals, derived manufacturing fields, asset paths, and schema metadata are not authoritative.
- Move profile publication plus onboarding-completion updates into one database RPC/transaction.
- Move complete profile-link replacement into one database RPC/transaction and use it from both dashboard and onboarding flows.
- Move registration-intent supersession into one database RPC/transaction so an existing link remains usable unless its replacement is successfully created.
- Make profile-photo deletion consistent: clear the database reference and delete the object in a recoverable order, with an explicit cleanup strategy if the second operation fails.
- Add migrations rather than modifying already-applied migration semantics. Migrations must be safe to apply to existing installations.

### 3. User-facing behavior

- Make photo upload submit when the user selects a file, provide a visible delete control, expose progress/errors accessibly, and align application validation with Next.js Server Action upload limits. The accepted size will be configured explicitly rather than relying on framework defaults.
- Preserve custom-logo data through local restoration and checkout. A custom-logo submission without actual image data must be rejected instead of being accepted as complete.
- Make saved-card availability reflect whether a usable custom-logo asset exists. No configuration should silently claim an asset that was discarded.
- Add dashboard fields for WhatsApp, location, and the phone/email/WhatsApp/location visibility flags already present in the model.
- Render visible location on the public profile.
- Protect existing published contact behavior when applying visibility defaults. The migration must avoid silently hiding contact methods that were public before visibility controls existed.
- Use the configured public-site origin for copied/shared profile URLs, with the current canonical domain only as an explicit fallback.
- Apply the same length, normalization, and contact-format rules to dashboard edits as onboarding edits.
- Correct form label associations, separate compound labels, and implement focus entry, trapping, Escape handling, and focus restoration for dialogs and drawers.
- Replace eligible raw image elements with `next/image`, while retaining native elements only where blob/data URL behavior makes optimization inappropriate and documenting the lint exception narrowly.

### 4. Operational and migration robustness

- Give LinkedIn token/profile requests bounded timeouts and convert upstream failures into the existing safe dashboard error flow.
- Make admin invitation provisioning retry-safe. A failure after identity creation must not create duplicate accounts or strand the operator without a recoverable retry path.
- Persist the uploaded `photo_path` during legacy import and make import retries idempotent across profile, links, and photo stages.
- Reject or disambiguate reserved slugs when creating initial drafts and admin-generated profile slugs, not only at publication time.

## Data-flow decisions

### Card registration

The client submits a versioned set of primitive selections and user-entered identity fields. A shared pure server module validates the selections, calculates the canonical price, and builds the manufacturing specification. The stored registration payload is produced from this canonical result. Existing valid customizer submissions remain accepted through an explicit compatibility parser; unknown fields are ignored or rejected according to the schema rather than trusted.

### Profile publication and links

PostgreSQL functions execute the multi-table state changes under the caller's authenticated identity. The functions validate ownership and return only the values required by the calling action. Service-role access is not introduced into ordinary dashboard actions.

### Profile images

Object paths remain owner-scoped. Public read authorization is derived from a published profile row referencing the exact object path. Upload and removal actions validate ownership and MIME/size constraints. Failed physical cleanup can leave an unreferenced object for later deletion, but must never leave a published profile pointing to a deleted object.

## Error handling

- Expected validation and authorization failures return stable user-facing messages and do not expose provider or database internals.
- Transactional operations either commit all state changes or none.
- External provider calls use timeouts and distinguish invalid callbacks from temporary upstream failures.
- Cleanup failures are logged server-side while preserving the user's consistent database state.
- Browser forms retain the user's entered values when a recoverable action fails.

## Testing strategy

Each behavior change follows a red-green regression cycle.

- Unit tests cover card-schema rejection, canonical pricing/manufacturing, slug rules, URL generation, visibility mapping, logo restoration, and validation limits.
- Action/service tests cover atomic publication, link replacement, registration-intent supersession, photo lifecycle, admin retry behavior, and LinkedIn error mapping.
- SQL policy/RPC tests exercise anonymous, owner, other-user, and administrator roles where the local Supabase test environment permits.
- Route tests cover `/dashboard`, nested dashboard routes, authenticated users, synthetic cookies, and non-admin `/admin` access.
- Browser checks cover desktop and mobile upload/delete controls, all contact visibility controls, custom-logo restoration/checkout, modal/drawer keyboard behavior, and the public location display.
- Final verification runs the complete unit/integration suite, lint, production build, production dependency audit, and representative browser flows.

## Rollout and compatibility

- Apply additive database migrations before deploying code that invokes new RPCs or depends on the new policy.
- Keep migration functions compatible with existing rows and make backfills deterministic.
- Do not invalidate existing registration links during rollout.
- Do not delete existing Storage objects as part of the policy migration.
- Document any production backfill or deployment ordering in the existing rollout documentation.

## Completion criteria

- Every finding in the 2026-09-06 audit is either repaired and regression-tested or documented as an intentional, verified exception.
- Anonymous users cannot read draft profile images.
- Protected routes and admin denial behave consistently without runtime exceptions or cookie-name bypasses.
- Client payload tampering cannot alter canonical price or manufacturing data.
- Publication, link replacement, and intent replacement cannot partially commit.
- Photo, contact visibility, location, custom-logo, and profile-link workflows work on desktop and mobile.
- Legacy import and provider/admin retries do not create broken or duplicate state.
- The full automated suite, lint, production build, dependency audit, and browser verification complete successfully.
