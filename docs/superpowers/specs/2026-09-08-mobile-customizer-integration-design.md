# IQ Card Mobile Customizer Integration Design

**Date:** 2026-09-08  
**Status:** Approved in conversation; awaiting written-spec review

## Goal

Recompose the existing `/customize` production customizer into an iPhone-first experience at approximately `max-width: 768px`, using the supplied `iq-mobile-customizer-prototype.html` as the mobile layout and interaction reference while leaving the desktop Classic Atelier visually and functionally unchanged.

The mobile experience must keep the configured card visible while the user makes decisions, replace inspection scrolling with direct finger drag, place controls directly beneath the card, and retain the existing configuration, renderer, persistence, validation, and email handoff systems.

## Scope and non-goals

In scope:

- Mobile-only layout and interaction changes in `public/customize/index.html`.
- Hiding the current marketing hero and lower story sections on mobile.
- A compact sticky top bar, persistent card stage, active-step controls, and safe-area-aware bottom navigation.
- Direct pointer drag rotation for the existing CSS/PBR card renderers.
- Mobile horizontal snap rows for materials and custom colors.
- Mobile placement of the existing final summary and order-review panels below the card stage.
- Responsive verification at 360×800, 390×844, 393×852, 430×932, and a desktop regression viewport.

Out of scope:

- Rewriting the customizer in React.
- Replacing or duplicating the PBR/WebGL renderer.
- Changing production card options, prices, payload schemas, storage keys, validation rules, API routes, or magic-link behavior.
- Adding the prototype’s “remove IQ mark” behavior. Production contract and tests require the IQ mark to remain available as the built-in logo; the optional custom logo remains supported.
- Adding a prototype-only reset flow. Existing saved-design and autosave behavior remains authoritative.

## Existing production boundaries

The production customizer is a guest-accessible static HTML/JavaScript route served from `public/customize/index.html` through the `/customize` rewrite. The single runtime owns:

- `configuration` state and the `STEPS` sequence: `core`, `material`, `identity`, `logo`, `craft`, `final`.
- Six production materials, six custom colors, black/white NFC core choices, identity name/tone, logo upload and placement, five craft treatments, and final handoff data.
- CSS fallback rendering and the `PBRRenderer` WebGL2 renderer, including material profiles, decals, craft profiles, and guided poses.
- Autosave to `iqcard.savedDesigns.v1`, explicit saved-design history, logo persistence, checkout marker persistence, configuration validation, provisional quote generation, and `/api/checkout/handoff` magic-link handoff.

The mobile implementation will call the same `renderCard`, `renderControls`, `setStep`, `saveCurrentDesign`, `openOrderReview`, and `confirmBuild` paths. Mobile view rotation is transient and must never be included in the persisted configuration or checkout payload.

## Mobile layout

At `max-width: 768px`:

1. Hide `.hero` and `.story` so the route opens directly into the atelier.
2. Keep `.topbar` sticky at the top with the existing IQ identity and live-step status.
3. Make `.atelier-shell` a single-column flow with the stage before the controls.
4. Make `.stage-wrap` sticky beneath the top bar, with a compact stage height derived from viewport height. The card remains visible while the controls scroll underneath it.
5. Remove the mobile inspection scroll surface: `.scroll-track` must not be an independently scrolling 560px viewport and `.scroll-space` must not create an oversized scroll journey.
6. Keep the existing controls directly after the stage. Only the active `[data-step]` panel is visible.
7. Keep the existing `control-foot` as a fixed bottom bar with safe-area padding, large Back/Continue targets, and enough bottom content padding that no field is obscured.
8. Convert `.material-grid` and `.custom-color-grid` to horizontal snap rows where their content benefits from lateral browsing. The page itself remains the only vertical scroller.
9. Increase mobile controls to a minimum 44px interactive dimension; preserve the existing typography, neutral palette, pink accent, material swatches, and card shadows.

The mobile stylesheet must be scoped under the existing customizer selectors and media queries. No desktop selector or default desktop dimension may be changed to support the mobile layout.

## Mobile card inspection

The current desktop inspection choreography remains unchanged. On mobile:

- The physical card hit area receives `pointerdown`, `pointermove`, `pointerup`, and `pointercancel` with pointer capture and `touch-action: none`.
- Dragging horizontally changes the Y rotation; dragging vertically changes the X rotation. Rotation is clamped to a readable range and uses the prototype’s gentle near-front snap.
- Each update applies to the visible CSS card and calls `window.__iqPBR.setPose(...)` when WebGL is ready.
- `STEP_POSES` remains the source of the initial guided pose for each step. On mobile it is converted to an angle pose rather than a scroll position.
- The existing desktop `sceneAngles`, `scrollTrack` listener, pointer lighting behavior, and scroll labels remain active outside the mobile branch.
- The card’s drag surface is limited to the card hit area so users can still vertically scroll from the surrounding stage and controls.
- Reduced-motion users receive the same stable pose behavior without animated transitions.

## Step and control mapping

The prototype’s sequence maps directly to the production sequence:

| Step | Mobile presentation | Existing behavior reused |
| --- | --- | --- |
| Core | Two large core cards | `configuration.core`, core palette, `renderCard`, autosave |
| Material | Horizontal material cards and color row | `setMaterial`, `setCustomColor`, material/PBR profiles, quote |
| Identity | Name field, tone choices, live identity echo | `identityNameError`, identity state, name decal rendering |
| Mark / Logo | Existing upload and placement controls | logo persistence, file validation, placement sliders, PBR decals |
| Craft | Touch-friendly craft cards and light sweep | craft state, CSS classes, `PBRRenderer.sweep`, quote |
| Final | Final object summary and saved-design action | `renderCommercialSummary`, `saveCurrentDesign`, `openOrderReview` |

Production functionality remains authoritative where the prototype differs. The IQ mark is not removed; a custom upload remains the optional second logo supported by the current production contract.

## Final object and checkout handoff

Desktop final mode remains unchanged: the controls disappear and the existing commercial panel overlays the inspection stage.

On mobile, final mode must keep the card stage present and move the existing commercial panel into the active Final control panel region through a layout adapter. The element itself, its IDs, and its handlers are reused; no second summary or checkout implementation is created. The order-review panel follows the same mobile location so its email field and validation remain below the visible card.

The mobile flow is:

`Final → Save this design` (existing local explicit save)  
`Final → Continue → Order Review → Confirm build → existing server handoff`

The existing email validation, `/api/checkout/handoff` request, local recovery marker, response redirect, and magic-link dashboard flow are unchanged.

If the viewport crosses the 768px breakpoint, the layout adapter restores the panels to their desktop stage anchors and restores the existing desktop final-mode behavior. A resize must not mutate `configuration` or persisted records.

## Error and accessibility behavior

- Identity validation blocks Continue from Identity and keeps focus on the invalid name field.
- Logo upload errors remain visible in the active mobile control context; unsupported type, size, and persistence errors use the existing validation messages.
- Order-review errors remain next to the email field and in the existing live status region.
- All active step panels retain their existing semantic labels and `aria-pressed` state.
- Drag interaction has a visible instruction and does not remove keyboard access to controls.
- Fixed bottom navigation includes safe-area padding and remains visible without covering the active input or primary action.
- Horizontal rows use native touch scrolling with hidden scrollbars and do not create a second vertical scrolling container.

## Testing and verification

Add focused tests for:

- Mobile inspection pose calculation, clamping, and near-front snap.
- The mobile branch’s responsive contract: hero/story hidden, stage/control ordering, no mobile inspection overflow, and final/order panel mount points.
- Existing customizer source contracts updated only where the new mobile behavior requires a stable hook.

Run the existing full Vitest suite, ESLint, and production build.

Use a browser-based verification pass at 360×800, 390×844, 393×852, 430×932, and a desktop viewport around 1440×900. For each mobile viewport, confirm:

- No horizontal overflow.
- No nested vertical scrolling.
- The card remains visible above the active controls.
- Direct drag rotates the card and updates the WebGL/fallback renderer.
- Materials/colors can be browsed horizontally without moving the page sideways.
- Back and Continue remain visible and usable.
- Identity validation, autosave, final save, and email handoff remain functional.

For desktop, confirm the existing Classic Atelier composition, scroll inspection, final overlay mode, and checkout actions remain unchanged.

## Implementation boundary

Expected production changes are limited to the customizer HTML/CSS/JavaScript and focused test/support modules for mobile inspection calculations. Existing server-side, persistence, renderer, and authentication modules should not be changed unless verification exposes a pre-existing integration issue directly caused by the mobile layout.
