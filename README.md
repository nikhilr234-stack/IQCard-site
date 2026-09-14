# IQ Card

IQ Card is a reusable profile-card application built with Next.js and Supabase. Each signed-in client owns one profile, edits it as a draft, and publishes it at a custom URL.

## Registration and onboarding flow

1. Open `/customize` and build a card without signing in.
2. In the final review, enter an email and choose **Confirm build**. IQ validates the name and email, saves a hashed registration intent, and sends a magic link.
3. Open the link on any browser or phone. IQ verifies the email and atomically claims the design only when the verified address matches.
4. Complete the resumable identity, contact, content, address, preview, and publish steps.
5. Keep the profile as a private draft or explicitly publish it.
6. Completed users return to `/dashboard`.
7. Share `/{your-slug}` or download the contact card.

The customizer still keeps a local autosave for quick recovery, but the email handoff is stored in Supabase so it is not tied to the browser that created it.

The Identity step requires both a first and last name and shows the error beside the field before the visitor can continue. The final review marks email as required and displays specific empty or invalid email guidance beside the input.

LinkedIn import is optional. The editor only shows it when `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET` are configured, and the integration uses LinkedIn's basic OpenID Connect scopes.

## Production email setup (Phase 4B)

Local development can use Supabase's built-in email service, but production client invitations and magic links require a custom SMTP provider. Resend is the recommended starting option; AWS SES, Postmark, SendGrid, Brevo, and other SMTP providers also work.

In the Supabase dashboard, open **Authentication → Emails → SMTP Settings**, then enter the provider's SMTP host, port, username, password, sender email, and sender name. Verify the sending domain with the provider and configure SPF, DKIM, and DMARC records. Keep SMTP credentials in Supabase only; never add them to `.env.local` or source control.

After saving the settings, test `/login`, the **Send access link** button in `/admin`, and the customizer's **Confirm build** flow with a real client email. The direct token-hash template documented in `supabase/README.md` supports opening the link in another browser or device. If a link expires or is already used, request a fresh link.

## Registration rollout

The production wizard is guarded by `IQCARD_ONBOARDING_V2`. Leave it `false` until migrations `202609050002` through `202609050005` are applied and `IQCARD_RATE_LIMIT_SECRET` is configured. Then enable it in preview, test the complete email flow, and promote the same configuration to production. Setting the flag back to `false` restores the legacy handoff without deleting data. See `supabase/README.md` for the exact rollout order.

## Local development

Copy `.env.example` to `.env.local`, fill in the Supabase values, then run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Verification commands:

```bash
npm test -- --run
npm run lint
npm run build
```

## Remaining phases

Phase 3 adds the admin client list, onboarding, access-link management, and admin profile controls. Phase 4 adds the landing-page polish, production deployment configuration, end-to-end security review, and monitoring. No public deployment is configured by this repository yet.

## Legacy profile migration

Phase 4A includes a dry-run-first importer for the existing static profiles. It reads only the canonical root-level profile folders and ignores the archived `IQCard-site-git/` copy. Profiles without an email remain unchanged, and matched records are imported as drafts only.

Run a read-only inventory first:

```bash
npm run migrate:legacy -- --dry-run
```

Limit the inventory to one profile or request JSON output:

```bash
npm run migrate:legacy -- --dry-run --slug teju --json
```

The first database-writing pass must be explicit:

```bash
npm run migrate:legacy -- --import --slug teju
```

The importer does not send invitations, publish profiles, overwrite existing profiles, or delete legacy files. Profiles reported as `pending account` must first be onboarded through `/admin`, then the dry run can be repeated.
