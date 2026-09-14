# IQ Card V1 Freeze Design

## Purpose

Freeze the standard IQ Card customizer into a short, curated V1 flow. The customer selects an approved surface, identity, composition, reverse content, and review only. Manufacturing choices and logo customization become fixed production standards.

## Product system

The only selectable surfaces are:

- Core: White, Black, Graphite
- Seasonal Core: Terracotta, Mustard, Oxblood
- Material Editions: Walnut, Natural Oak, Travertine, Concrete, Ivory Marble, Oxidised Steel

Edition metadata is a single source of truth with `Available`, `Next Release`, and `Returning` statuses. At launch, Walnut, Travertine, and Concrete are available; Natural Oak and Ivory Marble are next release; Oxidised Steel is returning. Non-available editions remain visible but cannot be selected, priced, checked out, or restored as a live purchase.

## Interaction and rendering

The wizard has five steps: surface, identity, composition, reverse, review. Matte and laser-engraved/recessed are fixed V1 production attributes, not inputs. The IQ mark is a fixed rendered object at the top-left in every composition; the preview must not render a custom upload or move the mark. The entered name is used immediately, with `Your Name` as the neutral initial preview.

The 12 supplied renders are added as static product-reference assets and used for material gallery art and the high-fidelity visual treatment. The existing interactive 3D card, rotation behavior, responsive layout, checkout and save-design flows remain.

## Data contracts and migration

The canonical server payload accepts only the 12 materials and emits fixed `matte` and `laser-engraved` manufacturing metadata. It removes custom colours, alternate cores, finish choices, logo assets/placement, and craft choices from the V1 configuration and pricing. Stored V1 records are normalized into the fixed fields where possible; records containing unsupported materials or unavailable editions are rejected rather than silently becoming purchasable.

Saved-card display derives its material and fixed production language from the canonical V1 payload, without exposing logo-placement or finish-selection fields.

## Verification

Tests cover material allowlisting, availability gating, fixed production metadata, payload rejection of legacy/custom-logo/craft values, stored-configuration migration, and removal of obsolete controls from the customizer document. Build, lint, and the full test suite verify the application still compiles and integrations remain coherent.
