# IQ Card Admin Dashboard Design

## Goal

Replace the current minimal `/admin` page with the approved IQ Card Admin Dashboard while retaining the existing secure onboarding, resend-invite, and publication workflows. The dashboard must be driven by real client data, not mock data.

## Visual direction

`/Users/soumyar/Downloads/admin-approved-target.png` is the visual authority. The route uses the IQ Card family: warm white surfaces, editorial black type, thin neutral borders, restrained status colour, dense but calm operations UI, and generous negative space. It must not introduce a dark SaaS theme, saturated gradients, or a third-party component-library appearance.

## Data model

Existing tables remain authoritative:

- `user_accounts`: client identity and join date.
- `profiles`: profile URL and publication status.
- `onboarding_progress`: started and completed lifecycle timestamps.

Add `client_admin_metadata`, keyed by client `owner_id`, for admin-only data unavailable today:

- `segment text not null default 'Unassigned'`
- `invite_sent_at timestamptz`
- `invite_opened_at timestamptz`
- `last_active_at timestamptz`
- standard creation/update timestamps.

The table is RLS protected and only accessed through the server-side admin client. Existing client rows receive metadata records through a migration. New onboarding and resend-invite actions update `invite_sent_at`; creation initializes the row.

## Canonical client mapping

The server repository returns `AdminClientDashboardItem`, a real-data mapping compatible with the supplied feature's `Client` interface.

- Name/email/join date come from `user_accounts` and profile.
- Profile URL and Live/Draft state come from `profiles`.
- Invited is a client with no profile after an invite has been sent; No profile is an older client without either state.
- Completion derives deterministically from `onboarding_progress.completed_steps` against the six known onboarding steps.
- Started/completed derive from `onboarding_progress` timestamps and steps.
- Segment/invite/activity fields come from `client_admin_metadata`.

The UI receives exactly one `Client[]` input. Pure selectors calculate KPIs, charts, insight rail, directory filters, sorting, pagination, and CSV data from that one input.

## UI integration

- Place the adapted supplied admin feature under `src/features/admin`.
- Mount a client-side `AdminDashboard` from the existing server `/admin` route after `requireAdminAccount()` and `listAdminClients()`.
- Preserve the source feature's table/search/filter/export/accessibility behavior.
- Use server actions as injected mutation callbacks: onboard, publish, unpublish, resend, and set segment. Refresh/revalidate after success and show accessible status feedback after failures.
- Import an admin-scoped stylesheet from the route feature. Add only missing token aliases to global tokens.
- Keep the existing `/admin` authorization boundary and loading state.

## Error handling and security

- All mutations call `requireAdminAccount()` before using the service-role Supabase client.
- Validate email, status, profile ID, and segment values on the server.
- Do not expose service-role credentials or draft profile details to the browser.
- When metadata, profile, or progress rows are absent, map predictable neutral values rather than manufacturing history.

## Verification

- Unit-test client mapping and selector behavior using representative real-data rows.
- Unit-test each server action's validation and metadata mutation.
- Component-test the dashboard's real dataset rendering and mutation callbacks.
- Run the full Vitest suite and `next build`.
- Visually inspect the protected admin route at approximately 1600px, 1200px, 900px, and 390px widths.
