# Phase 4C Canonical Domain and Routing Design

## Goal

Make `https://iqcard.in/` the single public landing page and use the same domain for client profiles without breaking existing `/iq` links.

## Current state

- The Next.js app already renders its landing page at `/`.
- Dynamic public profiles render at `/{slug}`.
- A legacy static landing page remains in the root `iq/` folder and has historically been reachable at `/iq`.
- The dashboard editor still displays `iqcard.me` in its profile URL and publishing copy.
- The local environment uses `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.

## Approved URL contract

| URL | Behavior |
| --- | --- |
| `/` | Canonical IQ Card landing page |
| `/{slug}` | Published individual client profile |
| `/iq` | Permanent redirect to `/` for legacy landing-page links |
| `/login`, `/dashboard`, `/admin`, `/auth`, `/api` | Reserved application routes |

The profile slug `iq` must not be used for a client because it is reserved for the legacy redirect. If an existing profile already uses `iq`, it must be renamed before production deployment; no profile is silently overwritten.

## Application changes

1. Add a permanent redirect for `/iq` to `/` in the Next.js routing configuration.
2. Add `iq` to the reserved profile slug set so new profiles cannot claim it.
3. Replace user-facing `iqcard.me` text with `iqcard.in` in the dashboard editor and publishing instructions.
4. Add tests for the reserved slug and redirect configuration.
5. Keep the legacy `iq/` files untouched as source material until production deployment is complete; the Next.js route owns `/iq`.

## Production configuration

Before deployment:

- Set `NEXT_PUBLIC_SITE_URL` to `https://iqcard.in` in the hosting environment.
- Set Supabase **Site URL** to `https://iqcard.in`.
- Add `https://iqcard.in/auth/callback` to Supabase **Redirect URLs**.
- Keep `http://localhost:3000/auth/callback` for local testing.
- Point the `iqcard.in` hosting DNS records to the production host without removing existing Resend SPF/DKIM records.

## Data and compatibility rules

- One client continues to own one profile.
- Profiles remain draft or published according to their existing status.
- Existing profile slugs are not changed automatically.
- The `/iq` redirect preserves old landing-page bookmarks while the root landing page becomes canonical.

## Verification

- Unit tests reject `iq` as a profile slug.
- Unit tests verify the `/iq` redirect declaration.
- TypeScript, lint, and production build pass.
- Local browser checks confirm `/` shows the landing page, `/iq` redirects to `/`, and `/nikhil` remains a profile URL.

