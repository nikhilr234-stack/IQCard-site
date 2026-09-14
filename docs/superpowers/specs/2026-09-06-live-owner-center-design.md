# Live Owner Center dashboard design

## Purpose

Replace the presentation of the published IQ Card owner dashboard with the approved `iq-dashboard-premium-v1.html` reference. This is a presentation and interaction integration, not an application rewrite. Existing authentication, Supabase data, routes, profile editing, content links, card customizer, and publication actions remain the system of record.

## Entry criteria and routing

- Draft or incomplete profiles continue to use the current setup editor and onboarding flow.
- A profile enters the Live Owner Center only when its persisted status is `published`.
- Existing `/dashboard`, preview, unpublish, and publish routes retain their behavior.
- “Edit details” returns the owner to the existing editable dashboard state; it does not create a second profile editor.

## Visual system

- Recreate the approved reference's sticky navigation, broad editorial hero, restrained off-white surfaces, rounded panels, thin borders, spacious desktop grid, and single-column mobile collapse.
- Use the existing site typography and CSS foundation, extending the dashboard styles rather than introducing a new application shell.
- Keep interactions purposeful: smooth in-page navigation, copy/share feedback, card hover depth, a card-management drawer, keyboard-close support, and responsive layouts.

## Data mapping

| Owner Center area | Source and behavior |
| --- | --- |
| Hero and public URL | Existing `Profile`: name, slug, publication state, and profile URL. |
| Identity preview | Existing profile fields, profile image when supplied, and `profile_links`. |
| Physical IQ Card | The owner's saved customizer payload associated with their claimed registration or legacy handoff. It must render its material, finish, engraved name, logo placement, NFC/design details, and any supported custom color. |
| Edit / preview / publish controls | Existing dashboard routes and server actions. |
| Content | Existing `profile_links`; counts and link rows derive from real saved links. |
| Share | Existing public URL, Clipboard API fallback, and native Web Share where available. |
| Card atelier | The existing customizer route and saved-card metadata. |

## Physical-card rule

The dashboard card renderer is derived only from the saved customizer configuration. It must never substitute profile initials, a profile photograph, an avatar, a sticker, a generated name, or a demo material for the physical card. When a legacy record lacks configuration needed for exact rendering, the UI will state that the saved configuration is unavailable and offer the existing card-management route instead of fabricating a card.

## Unsupported-data states

No prototype values will ship as owner data. Analytics, card-tap history, contacts, connection requests, and Spaces do not currently have production data models. Their modules remain visually consistent but show clear empty or coming-soon states. They will not display invented people, locations, counts, trends, or dates.

## Component boundaries

- `ProfileEditor` remains the mode switch between setup and live owner views.
- A dedicated published-owner component owns the reference layout and client-only interactions.
- A focused saved-card renderer translates the persisted customizer payload into the dashboard card visual and is shared by the live owner view and existing setup view where appropriate.
- Dashboard data preparation stays server-side in `src/app/dashboard/page.tsx`; presentation components receive typed profile and saved-design data.
- Existing profile actions stay unchanged and are passed through to the editor/controls where required.

## Validation and verification

- Add unit tests for the published/draft mode boundary and saved-card configuration parsing.
- Add regression tests confirming no initials/avatar/photo fallback exists in the physical-card renderer.
- Add presentation-contract tests for reference modules, real data bindings, and honest empty states.
- Run the complete test suite, TypeScript check, lint, and production build.
- Verify desktop and mobile dashboard rendering locally, then verify the deployed published dashboard and the draft setup route remain distinct.

## Out of scope

- New analytics, contact, connection, tap-tracking, Spaces, ordering, or payments backends.
- Changes to authentication, Supabase schema, registration flow, public profile behavior, or the card customizer's underlying business logic.
- Card scrolling work, which remains a later, separate task.
