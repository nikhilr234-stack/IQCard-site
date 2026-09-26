# Gift Factory Design

## Goal

Make creating and publishing an unclaimed IQ Card gift fast enough to complete in under 20 seconds, from the existing admin area, without opening another app or website.

## User-approved requirements

- The default create screen contains only **Full name**, **Email**, **Role**, a collapsed **Personalize** section, and **CREATE & PUBLISH GIFT**.
- Personalize contains optional tagline, phone, WhatsApp, location, LinkedIn, Instagram, website, portrait, and cover.
- Submitting validates the admin and input, generates a unique slug, uploads optional media, and atomically creates and publishes the gift.
- Every gift uses template `cover`, `profiles.owner_id = NULL`, the existing `profile_gift_claims` infrastructure, a Cover presentation, and supplied links. There is no onboarding, payment, recipient account requirement, or extra confirmation step.
- Success is immediately shown in-place: “Gift ready”, recipient name, public URL, and **Copy URL**, **Open Profile**, and **Add Details** actions.
- `/admin` has a global **+ Gift** action.
- Do not add another gift schema, modify normal customer onboarding, migrate files when a gift is claimed, or change media paths on ownership transfer.

## Architecture

### Admin UI and server boundary

Add a focused Gift Factory flow under `/admin/gifts`, protected by the existing `requireAdminAccount()` authorization. The admin entry point gets a global **+ Gift** button. The create page keeps optional fields collapsed by default, expands them under **Personalize**, and shows the success state in the same page after the server action returns. “Add Details” opens the existing gift edit flow for that new gift; it does not delay initial publication.

The server action validates admin authorization and all submitted fields before privileged operations. It generates a profile UUID and safe media object paths on the server. The browser never receives a service-role credential, and the admin list is the only place recipient claim metadata is read.

### Atomic creation and publication

Use one narrowly scoped database function/transaction for the profile, its existing gift claim row, presentation, provided links, and publication. Do not reuse owner-only publication RPCs. The function enforces admin authorization from trusted server/database identity, validates or reserves a unique slug, and writes publication last within the same transaction. A manual or generated slug collision must never overwrite an existing profile. The returned result contains only the profile ID, slug, and public URL data needed by the admin UI, not private claim information.

### Private gift media

Use a dedicated private Supabase Storage bucket named `gift-media`. Optional portrait and cover uploads are validated and uploaded server-side to stable paths under `gift/<profile-uuid>/...`. Store those same paths on the gift profile/presentation and retain them unchanged after claim; ownership transfer must not move or rename the objects.

Gift public media is addressed by public profile slug plus asset type (portrait or cover), never by a caller-supplied storage path. The server resolves the private object path only when that exact asset is referenced by the currently published profile and downloads it from the private bucket. Reject unknown slugs, drafts, missing references, and private claim data. Existing customer media behavior and policies are not broadened. Internal gift-media paths remain stable after a claim and are never returned to the browser.

### Failure behavior

Upload optional files before the database transaction, as requested. If validation fails, do not upload. If any upload fails, stop and remove any gift objects already uploaded in this attempt. If the database transaction fails, attempt to delete all uploaded objects for the generated gift UUID, report a clear retryable error, and do not show success. If cleanup itself fails, log the orphan paths server-side for follow-up; private bucket access still prevents those unreferenced objects from being served. Do not expose raw storage paths in errors or responses.

### Data and presentation behavior

Map **Role** to the existing profile headline/role field and **tagline** to the existing tagline field, after confirming actual schema names during implementation. Create the Cover presentation with existing Cover defaults, with no portrait override unless a portrait was supplied. Persist only supplied optional links using the existing supported link types and validation. The recipient email remains in the protected gift claim record and is not exposed in public profile data.

### Verification

- Unit/integration coverage for admin-only creation, required-field validation, role/tagline/link mapping, slug collision handling, transaction atomicity, and media cleanup on upload/transaction failure.
- Storage/media route coverage proving private arbitrary paths and unreferenced gift media are inaccessible, while referenced media for a published gift is served.
- Verify that claiming a gift changes ownership/claim status without changing portrait or cover paths.
- Verify customer onboarding and existing customer media access remain unchanged.
- Verify the live admin flow creates a published public URL and the success actions work.

## Explicit non-goals

- Changes to ordinary customer onboarding or profile publication.
- Payments, invitation emails, or requiring the recipient to create an account before the gift is live.
- New gift tables or a file-migration process on claim.
- A redesign of the broader admin dashboard.
