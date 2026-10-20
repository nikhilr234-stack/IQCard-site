# IQ Card print desk

User-confirmed blank size: 85.6 × 54 mm. Export the saved customer front/back for temporary matte-laminated stickers, with precise PDF dimensions and high-resolution JPEG/PNG.

Use the existing Atelier WebGL material shader and existing decal drawing functions, rather than recreating layouts. Export is unlit, square art; the cut contour is separate. Preserve all saved identity, composition, placement, tone, logo and back-layout values. Existing system-font rendering cannot guarantee historical cross-platform glyph equality: record font environment and require proof approval.

Admin-only /admin/print lists up to 100 records per source: frozen order snapshots, claimed registration designs, claimed legacy handoffs. Require verified admin before fetching any design. Resolve exact source+record ID; never fall back to another/default card. No writes or migrations. Mutable saved designs and immutable order snapshots are labelled distinctly.

Flat export lives inside the actual Atelier in print mode and uses no local saved-card history. Same materialPattern GLSL renders an unlit full-rectangle surface; existing drawFrontDecal/drawBackDecal render at doubled resolution after custom logos/fonts load. Artwork uses original normalized positions. Export at 600 DPI by default. Finished blank 85.6 × 54 mm; inset default 0 mm, bleed default 3 mm, safe margin default 3 mm; corner radius proposed 3.18 mm pending physical confirmation. All printer settings editable and bounded. Full artwork remains square to avoid white clipped bleed corners. Back is readable, never mirrored.

PNG and JPEG include actual DPI metadata. Two-page cut-size PDF has exact sticker dimensions. Two-page press PDF includes bleed/crop marks with exact TrimBox and BleedBox; separate SVG rounded cutting contour. ZIP contains both sides in both formats, PDFs, cut contour, and a manifest with configuration revision and settings. No hidden guide lines in raster art.

Preflight measures text/logo bounds against safe and trim areas, reports small text and effective raster logo resolution, blocks clipped content or failed asset/render loading. It must not silently resize/reposition art. Nonprinted treatments are simulations on matte stickers, disclosed. No QR code exists in current physical artwork, so do not add one.

Acceptance: geometry/metadata/PDF parsed independently; API rejects anonymous/nonadmin/malformed/missing records; no DB query before auth; scene restoration unchanged; browser tests cover all 12 surfaces × 5 compositions × 4 backs × tone/core, custom logo and clipping. Printer proof/fit/colour sign-off remains a physical step. Recovery branch and iqcard-app Preview only.
