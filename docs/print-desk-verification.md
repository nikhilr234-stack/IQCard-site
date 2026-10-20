# Print desk verification — 20 October 2026

- User confirmed blank size: **85.6 × 54 mm**.
- Full suite: 1,062 tests across 144 files; lint, TypeScript and Next production build pass.
- Browser: 240 material/composition/back combinations with alternating tone/core; custom logo appears on both intended sides; empty name stays empty; no page errors or mobile horizontal overflow; dirty dimension settings disable stale exports.
- Independent Python zipfile/Pillow/PyPDF verification: archive CRCs valid; both-side PNG/JPEG 2164 × 1417 with 600 DPI metadata; actual-size PDF has two 85.6 × 54 mm pages; press PDF trim width/height 85.6 × 54 mm and 3 mm bleed.
- Browser shader regression demonstrated RED mean pixel channel error 0.99054375 when adding bleed, then GREEN 0.000009375 after moving UV clamping to the fragment shader. Bleed must not rescale the material pattern inside trim.
- Independent review identified and fixed: print-specific payload completeness (no replacement logo/core/craft/placement defaults), bleed UV clamping, and explicit order lookup outside the latest 100 queue. Regression tests added for each.
- Scripts: `scripts/verify-card-print.cjs` uses Playwright and optional `PRINT_CHROMIUM_EXECUTABLE`; writes to `PRINT_VERIFICATION_DIR` or git-ignored `.print-verification`.

## Verification limits
Browser data is a fixture injected at the admin API boundary, not an authenticated live database journey. No production client design was read or changed. Deployment and actual sandbox admin selection still require a signed-in session.

Existing designs use system Helvetica/Arial fonts. Historical cross-platform glyph equality cannot be proved without saved font outlines or a canonical font asset; export records the workstation's font metrics. Material is unlit using the same shader pattern and base; physical reflections are excluded, and craft depth/foil is simulated ink. RGB output is not PDF/X/CMYK certified. Corner radius 3.18 mm, bleed 3 mm and inset 0 mm are editable proposed settings, not user-confirmed printer specifications. A physical matte-laminated proof must approve fit, colour conversion, legibility and lamination before batch production.

Work remains on recovery Preview. No schema change, production promotion, payment change or production database mutation.
