# IQ Card Phase 1: Foundation Design

## Purpose

Replace the current manually copied static profile-page workflow with the foundation of a production web application. Phase 1 establishes secure sign-in and authorization only; it does not yet replace existing client profile pages.

## Decisions already made

- The product serves individuals: one client account owns one profile in version one.
- Clients can register and publish immediately once profile publishing is added in Phase 2.
- Administrators can create a client record and invite that person to claim it.
- Sign-in uses email magic links or one-time codes, not passwords.
- The present static pages remain intact during the transition.
- The current IQ Card marketing page will be addressed later as a landing-page project.

## Phase 1 scope

### Included

- Next.js application shell, using the App Router and TypeScript.
- Supabase integration for authentication and the Postgres database.
- Email magic-link sign-in flow.
- User records with `client` and `admin` roles.
- Protected client dashboard route and protected admin route.
- Role-aware redirects after sign-in.
- A safe, documented mechanism to bootstrap the first administrator without embedding credentials in source code.
- Environment-variable template and local setup documentation.
- Automated tests for pure authorization and redirect logic.

### Excluded

- Client profile creation, editing, images, social links, VCF generation, public profile rendering, and publishing controls (Phase 2).
- Admin client onboarding screens (Phase 3).
- Migration of existing static profiles (Phase 4).
- Centralized analytics, billing, notifications, and the landing page.

## Architecture

The app will use Next.js App Router. Server-rendered pages read the authenticated Supabase session. Browser-only components are limited to the authentication form and other interactive controls. Supabase supplies authentication and Postgres; its Row Level Security (RLS) rules enforce that a signed-in client can read only their own account record, while admins can read all accounts.

The current static files continue to be served independently until profile migration is complete. The new Next.js application is added at the repository root under `src/`, with no changes to existing profile HTML files.

## Data model

Phase 1 creates an application-owned `user_accounts` table keyed by Supabase Auth's user UUID.

| Column | Meaning |
|---|---|
| `id` | Supabase Auth user UUID; primary key |
| `email` | Normalized email address for admin lookup and display |
| `role` | Either `client` or `admin` |
| `created_at` | Account creation timestamp |
| `updated_at` | Most recent account update timestamp |

Every new authenticated user receives a `client` account record automatically. A database-safe administrator bootstrap procedure promotes only email addresses listed in the server-only `IQCARD_ADMIN_EMAILS` environment variable. The variable is not exposed to browsers.

Phase 2 will add a one-to-one `profiles` table that references `user_accounts.id`.

## Authentication flow

1. A visitor enters their email address at `/login`.
2. Supabase emails a magic link that returns to `/auth/callback`.
3. The callback exchanges the returned code for a secure session.
4. On first login, the database creates a `client` account record.
5. If the email appears in the server-only admin allow-list, the account role is promoted to `admin`.
6. Admins go to `/admin`; clients go to `/dashboard`.
7. Unauthenticated users who request protected routes are sent to `/login` with a safe return path.

## Routes

| Route | Access | Phase 1 behaviour |
|---|---|---|
| `/` | Public | Temporary product-home placeholder; static legacy pages remain untouched |
| `/login` | Public | Email magic-link request form |
| `/auth/callback` | Public callback | Exchanges authentication code, then redirects by role |
| `/dashboard` | Client or admin | Protected client dashboard shell |
| `/admin` | Admin only | Protected admin shell; clients receive a forbidden response |

## Security requirements

- No passwords, service-role keys, or admin email values are committed to source control.
- All authorization checks run on the server; hiding links in the UI is not treated as authorization.
- RLS is enabled on every application table from its first migration.
- Clients cannot grant themselves the admin role.
- Redirect destinations are restricted to internal application paths to prevent open redirects.
- Supabase site and redirect URLs are configured explicitly per environment.

## User experience

The initial product UI remains intentionally small: login, a confirmation state after requesting the email, and minimal dashboard/admin shells. The visual language will take inspiration from the existing dark IQ Card styling, but no legacy page is copied into the application in this phase.

## Deployment and configuration

The production app is intended for Vercel with a Supabase project. Required environment variables are:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
IQCARD_ADMIN_EMAILS=
NEXT_PUBLIC_SITE_URL=
```

The Supabase dashboard must be configured with the local development callback and the production callback URL. `IQCARD_ADMIN_EMAILS` is a comma-separated, server-only list of the initial administrator emails.

## Acceptance criteria

- A user can request and complete passwordless email sign-in.
- First sign-in creates exactly one `client` account record.
- An allow-listed administrator receives the `admin` role and reaches `/admin`.
- A non-admin cannot access `/admin`, even by entering the URL directly.
- A signed-out user cannot access `/dashboard` or `/admin`.
- Existing static HTML profile files remain unchanged.
- Automated tests cover role destination selection and return-path validation.

## Risks and deferred decisions

- Email delivery depends on Supabase's configured email provider and domain settings. Development can use Supabase's default mail service; production volume may later require a dedicated provider.
- The admin allow-list is appropriate for initial bootstrap. Phase 3 will move ongoing role administration into the admin portal.
- Public profile URL selection and legacy URL redirects are intentionally deferred until Phase 2 and Phase 4.
