# IQ Card Admin Workspace Interactions Design

## Goal

Upgrade `/admin` into a full-viewport, spacious, interactive administration workspace. It must use the supplied `iq-card-admin-ui-spacious-interactive.zip` as the visual and behavioral reference while retaining the existing secure Supabase-backed client workflows.

## Layout

The admin shell is full bleed and must not inherit marketing-page max-width rules. At 1440–1800px it shows the left rail, right insight rail, a 4×2 KPI grid, and a 2×2 analytics grid. At 1900px and above, it expands toward 8 KPI and 4 analytics columns; responsive breakpoints retain readable controls through 390px.

## Shared interaction model

`Client[]` remains the canonical source. Pure selectors produce every metric, chart, insight, directory row, and active analytical view. A dashboard view reducer represents search, status, date range, onboarding stage, completion range, selection, sort, pagination, and page size. Selecting a KPI/chart/insight updates this view, shows an Active view bar above the directory, and can be cleared.

## Functional admin destinations

- `/admin`: live Clients workspace.
- `/admin/analytics`: expanded analytics with synchronized 7/14/30/90-day range.
- `/admin/templates`: actual Minimal/Cover usage and client lists.
- `/admin/branding`: live presentation/brand summary from existing profile settings.
- `/admin/settings`: signed-in admin settings and operational controls.
- `/admin/notifications`: pending invites and recent onboarding events.

The sidebar, account menu, notification control, and card/chart interactions navigate to or filter these real views. They must not be decorative controls.

## Security and verification

All routes require `requireAdminAccount()`. Existing server actions remain the only mutation path. Test pure view selectors, interactions, route authorization, keyboard search focus, and responsive full-bleed CSS. Run full Vitest, production build, and inspect 1920/1600/1440/1200/900/390px.
