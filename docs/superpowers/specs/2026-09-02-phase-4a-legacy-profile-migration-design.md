# IQ Card Phase 4A: Legacy Profile Migration Design

## Goal

Move the existing static IQ Card profiles into the Supabase-backed profile system without deleting the legacy files, assigning a profile to the wrong person, or publishing unreviewed data.

## Approved scope

- Profiles with an email address in their canonical root-level VCF file are eligible for migration.
- Profiles without an email address remain in their existing static folders until the client supplies one.
- Every imported profile starts as a `draft`.
- The migration is repeatable and safe to run more than once.
- The first migration pass does not send invitation emails or publish profiles automatically.
- The duplicate `IQCard-site-git/` directory is treated as an archive and is not imported.

## Source inventory

The canonical sources are the root-level profile folders/files in this repository. The following records contain an email and are eligible for import:

| Profile | Source | Email source | Proposed slug |
| --- | --- | --- | --- |
| Aadhya Chintala | `aadhya/index.html`, `aadhya.vcf` | `aadhya.vcf` | `aadhya` |
| Hema Goyal | `hema/index.html`, `hema.vcf` | `hema.vcf` | `hema` |
| Infant Akash | `infant/index.html`, `infant.vcf` | `infant.vcf` | `infant` |
| Mithul | `mithul/index.html`, `mithul/mithul.vcf` | `mithul/mithul.vcf` | `mithul` |
| Naveen Samant | `naveen/index.html`, `naveen-samant.vcf` | `naveen-samant.vcf` | `naveen` |
| Nikhil Rakesh | `iq/index.html`, `nikhil.vcf` | `nikhil.vcf` | `nikhil` |
| Prerna Revankar | `prerna/index.html`, `prerna.vcf` | `prerna.vcf` | `prerna` |
| Rajesh Shetty | `rajesh/index.html`, `rajesh-shetty.vcf` | `rajesh-shetty.vcf` | `rajesh` |
| Rakesh B S | `rakesh/index.html`, `rakesh/rakesh.vcf` | `rakesh/rakesh.vcf` | `rakesh` |
| Ravichandra | `ravichandra/index.html`, `ravichandra.vcf` | `ravichandra.vcf` | `ravichandra` |
| Rohan Biligi | `rohan/index.html`, `rohan/rohan.vcf` | `rohan/rohan.vcf` | `rohan` |
| Sharath Rao H N | `sharath/index.html`, `sharath/sharath.vcf` | `sharath/sharath.vcf` | `sharath` |
| Tejashree Pradhap | `teju/index.html`, `teju.vcf` | `teju.vcf` | `teju` |

`Ashwin Reddy` and `Nikki` have no email in their canonical VCF/HTML data, so they remain unchanged for now. The `iq/index.html` file is the legacy landing page; only the Nikhil profile data represented by `nikhil.vcf` is considered for import.

## Ownership and account matching

The existing schema requires every profile to reference exactly one `user_accounts.id`. The importer therefore uses this order:

1. Normalize the VCF email to lowercase and trim whitespace.
2. Look up an existing Supabase Auth user by that email using the server-only service-role client.
3. If a matching account exists, import or update that account's profile.
4. If no account exists, report the record as `pending_account` and make no database change. The admin can onboard that person through the existing portal, then rerun the importer.

The importer never guesses an owner from a name, phone number, folder, or email-domain similarity. It never creates silent accounts and never sends bulk invitation email as part of the migration.

## Field mapping

The importer parses the VCF as the structured source and uses the matching HTML only for additional links or a local photo when the VCF does not contain that information.

| Legacy data | `profiles` field | Rule |
| --- | --- | --- |
| `FN` | `full_name` | Required; trim whitespace. |
| `TITLE` | `headline` | Trim; preserve the client's wording. |
| `NOTE` | `bio` | Trim; preserve line breaks as plain text. |
| `TEL` | `phone` | Keep the first usable telephone value. |
| `EMAIL` | `email` | Lowercase and trim. |
| `URL`/social links | `profile_links` | Normalize labels and accept only HTTPS, `mailto:`, or `tel:` values. |
| local profile photo | `photo_path` | Upload only after an account match; store under `<owner_id>/legacy/<filename>`. |
| folder name | `slug` | Lowercase the approved folder slug; resolve collisions by stopping for admin review rather than guessing. |

All imported records use `status = 'draft'` and `published_at = null`. The initial implementation has no overwrite mode: it is create-if-missing and report-if-existing, so an existing profile is never changed by a rerun.

## Migration workflow

The implementation will expose a dry-run/import command with two modes:

- `dry-run`: parse and validate every canonical source, show `ready`, `pending_account`, `invalid`, and `conflict` records, and perform no writes.
- `import`: require a clean dry-run result for the selected records, then create draft profiles, links, and private photo objects only for matched accounts.

Each run produces a redacted summary containing counts and profile names/slugs, never service-role credentials or authentication tokens. A failed photo upload or link insert aborts that profile and reports the profile as failed; it does not partially publish it.

## Safety and rollback

- Legacy HTML, VCF, and image files remain untouched.
- No profile is published by the importer.
- Existing database profiles are not overwritten by default.
- Before import, the command records the profile IDs and storage paths it creates. A rollback command can delete only those newly-created draft rows/objects from that run.
- Profiles with missing email, missing account, malformed VCF, duplicate slug, or conflicting existing owner are reported for manual review.

## Testing and acceptance criteria

Automated tests must cover:

- VCF parsing for names, email, phone, title, notes, and URLs.
- Email normalization and missing-email handling.
- Slug preservation, invalid slugs, and duplicate-slug conflicts.
- Link validation and deterministic ordering.
- Idempotent reruns and the no-overwrite default.
- Dry-run behavior with no database/storage writes.
- `pending_account` behavior when no Supabase Auth user matches.
- Photo path generation without exposing absolute local paths.

Phase 4A is accepted when a dry run reports the inventory above, all eligible records have deterministic mappings, no-email records are explicitly excluded, and an import of matched accounts creates only draft profiles that can be reviewed in the admin portal.

## Deferred work

- Sending invitations to pending accounts.
- Admin reassignment/claiming of profiles without email.
- Automatic publishing of migrated profiles.
- Production deployment, custom SMTP, monitoring, and backups (Phase 4B–4D).
