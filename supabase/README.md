# Supabase setup

Create a Supabase project, then apply these migrations in order in the SQL editor or with the Supabase CLI:

1. `migrations/202608300001_create_user_accounts.sql`
2. `migrations/202608300002_create_profiles.sql`
3. `migrations/202609050001_create_checkout_handoffs.sql`
4. `migrations/202609050002_create_registration_intents.sql`
5. `migrations/202609050003_create_onboarding_progress.sql`
6. `migrations/202609050004_add_onboarding_profile_fields.sql`
7. `migrations/202609050005_create_registration_rate_limits.sql`

Apply all migrations before enabling onboarding v2. The migrations are additive, and the legacy checkout handoff remains available for rollback. In Authentication → URL Configuration, set the production Site URL to `https://iqcard.in` and allow both `/auth/confirm` and `/auth/callback` for production and local development. At minimum, include `https://iqcard.in/auth/confirm`, `https://iqcard.in/auth/callback`, `http://localhost:3000/auth/confirm`, and `http://localhost:3000/auth/callback`.

Copy `.env.example` to `.env.local` and fill in the project URL, anonymous key, server-only service-role key, site URL, and a comma-separated list of initial administrator emails. Do not commit `.env.local`.

## Registration and onboarding v2 rollout

Generate a high-entropy server secret for `IQCARD_RATE_LIMIT_SECRET` (at least 32 random bytes). It is used only to HMAC rate-limit identifiers; never expose it through a `NEXT_PUBLIC_` variable.

1. Apply migrations `202609050002` through `202609050005` and leave `IQCARD_ONBOARDING_V2=false`.
2. Configure `IQCARD_RATE_LIMIT_SECRET` in every environment.
3. Verify the magic-link template and allowed callback URLs.
4. Set `IQCARD_ONBOARDING_V2=true` in preview and complete guest design → email → confirmation → onboarding → publish.
5. Enable the flag in production and monitor intent, email, claim, rate-limit, and onboarding events.

Rollback is immediate: set `IQCARD_ONBOARDING_V2=false`. The endpoint returns to `checkout_handoffs` and the existing dashboard flow; no migration needs to be reversed.

For the Phase 4A legacy migration, run `npm run migrate:legacy -- --dry-run` first. Only use `--import` after reviewing the summary. The importer uses the service-role key locally, never sends invitations, and creates draft profiles only for matching Auth users.

## Production email (Phase 4B)

The built-in Supabase email service is for development and testing. For production, configure a custom SMTP provider under **Authentication → Emails → SMTP Settings**. Resend is the recommended provider for this project, but any SMTP service supported by Supabase is acceptable.

Use a verified sending domain and configure SPF, DKIM, and DMARC with the provider. Keep SMTP credentials in the Supabase dashboard and do not commit them to the repository. After saving, test a client magic link and an admin invitation end-to-end.

## Cross-browser magic links

The IQ app completes sign-in on the server so a link can be opened from any browser or phone. In Authentication → Emails → Magic Link, use a direct token-hash link instead of the default PKCE confirmation URL:

```html
<p>Open this secure link to continue to your IQ Dashboard:</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&redirect_to={{ .RedirectTo }}">Continue to IQ</a></p>
```

Do not include `{{ .Token }}` in the template. The app's `/auth/confirm` route verifies `token_hash` once and redirects the user to their role-appropriate dashboard. It also accepts Supabase's one-time `code` callback as a compatibility fallback, so the default email template does not strand users who open the email in the browser that requested it. The direct token-hash template remains the recommended production setup because it also works when the email is opened on another browser or device.
