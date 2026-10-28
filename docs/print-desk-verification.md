# Print desk verification — 20 October 2026

- User confirmed blank size: **85.6 × 54 mm**.
- Full suite: 1,062 tests across 144 files; lint, TypeScript and Next production build pass.
- Browser: 240 material/composition/back combinations with alternating tone/core; custom logo appears on both intended sides; empty name stays empty; no page errors or mobile horizontal overflow; dirty dimension settings disable stale exports.
- Independent Python zipfile/Pillow/PyPDF verification: archive CRCs valid; both-side PNG/JPEG 2164 × 1417 with 600 DPI metadata; actual-size PDF has two 85.6 × 54 mm pages; press PDF trim width/height 85.6 × 54 mm and 3 mm bleed.
- Browser shader regression demonstrated RED mean pixel channel error 0.99054375 when adding bleed, then GREEN 0.000009375 after moving UV clamping to the fragment shader. Bleed must not rescale the material pattern inside trim.
- Independent review identified and fixed: print-specific payload completeness (no replacement logo/core/craft/placement defaults), bleed UV clamping, and explicit order lookup outside the latest 100 queue. Regression tests added for each.
- Scripts: `scripts/verify-card-print.cjs` uses Playwright and optional `PRINT_CHROMIUM_EXECUTABLE`; writes to `PRINT_VERIFICATION_DIR` or git-ignored `.print-verification`.

## Verification limits
Browser data is a fixture injected at the admin API boundary, not an authenticated live database journey. The initial browser pass did not read a production client design. The read-only customer follow-up below uses an actual saved snapshot; authenticated sandbox admin selection still requires a signed-in session.

Existing designs use system Helvetica/Arial fonts. Historical cross-platform glyph equality cannot be proved without saved font outlines or a canonical font asset; export records the workstation's font metrics. Material is unlit using the same shader pattern and base; physical reflections are excluded, and craft depth/foil is simulated ink. RGB output is not PDF/X/CMYK certified. Corner radius 3.18 mm, bleed 3 mm and inset 0 mm are editable proposed settings, not user-confirmed printer specifications. A physical matte-laminated proof must approve fit, colour conversion, legibility and lamination before batch production.

Work remains on recovery Preview. No schema change, production promotion, payment change or production database mutation.

## Follow-up: black-on-black screenshot

Read-only sandbox inspection confirmed selected frozen design IQD-E84B29 stores Black material, dark ink, the IQ mark, a name, and Pure back. These were present, but invisible dark-on-dark print ink was not detected by the first release's bounds-only preflight. The earlier 240-variant rendering check established canvas/asset availability, not print legibility.

Added full saved component analysis; measured contrast against actual unlit material pixels and logo alpha; block near-invisible identity ink; preserve original configuration and offer an explicit white/black flat print copy. Original and printed configurations, chosen ink and original revision travel together in the manifest; filenames distinguish saved ink from production overrides. Pure back remains without a name/logo. Opaque logo backgrounds must not cause false blocking of distinguishable foreground lettering; a reproducing regression test covers this case.

Browser verification using the exact selected card configuration confirms saved dark ink is blocked, choosing the explicit white-ink proof renders readable lettering/IQ mark, the original config stays dark and unchanged in the print pack, and the actual-size PDF remains85.6×54mm. The broader240-variant check now correctly flags30 low-contrast combinations. Also corrected inherited global main width and added source/origin-checked automatic iframe height. Queue metadata now includes saved name and material using JSON projections, excluding logo data.

## Follow-up: actual saved customer artwork

Read-only retrieval of the requested customer snapshot IQD-E9862A confirmed Ivory Marble, the saved name, dark engraved-style ink, Signature composition, right-aligned standard IQ mark, and Pure back. No custom logo was uploaded. Rendered that complete snapshot through the actual Atelier draw functions and flat material shader. The fixed NFC system caption now uses the opposite top corner from a right-aligned logo; customer artwork placement and saved material/ink remain unchanged. Browser bounds verification confirms the caption and logo do not overlap; preflight passes without an ink override. Customer data is excluded from the repository.

Added administrator-only private JSON snapshot import for Preview. It validates the complete physical-card payload with no defaults, checks same-origin requests, limits input size, keeps artwork only in tab session storage, and revalidates admin access and canonical configuration before every display. Expired authorization clears the cached snapshot. It makes no database changes.

Validation: full suite 1,081 tests across 146 files, lint and TypeScript pass. Independently verified both raster exports at 600 DPI, exact two-page 85.6 × 54 mm PDF dimensions, ZIP integrity, saved configuration identity, and visually inspected the actual exported front/back pixels plus rendered PDF. Physical matte-laminated fit and colour still require a printer proof.
