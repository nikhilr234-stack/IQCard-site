# Print fidelity audit — 21 October 2026

## Shipped improvements

- Each material image is SHA-256 checked against its fixed master before it is decoded or uploaded to WebGL. Changed/corrupt bytes block export even if image dimensions remain identical.
- The print renderer clones its supplied configuration and explicitly loads that material. A reproducing regression previously exported the already displayed Ivory Marble when supplied Walnut; the corrected call renders Walnut. Concurrent jobs and configuration changes cannot silently mix artwork.
- PNG and PDF are lossless masters. PDF pages embed compressed raw RGB, preserving exactly the same pixels as each PNG, rather than JPEG recompression. JPEG remains a sharing copy.
- Each ZIP includes `artwork-integrity.json`: file lengths/digests and a fingerprint binding the files to the configuration, dimensions, source record and revision. Fingerprints identify bytes; they are not signatures or evidence of customer approval.
- Print UI clearly distinguishes current artwork verification from missing historical texture/font approval and directs repeat printing to the archived PNG/PDF.

## Verified results

| Check | Result |
| --- | --- |
| Unit suite | 1,091 tests across 148 files passed |
| Material maps | All 12 match their master crop/orientation; mean resampling difference below 0.3 of 255 per channel |
| Rear-face orientation | All 12 front/rear surface comparisons pass; mean difference below 0.0001 of 255 per channel |
| Bleed invariance | All 12 remain unchanged inside trim; mean difference below 0.001 of 255 per channel |
| Print matrix | 240 combinations rendered; 30 near-invisible combinations correctly blocked |
| Job isolation | Original input mutation cannot change the render; superseded job rejects; newest job uses its own material |
| Source failure | Missing image and same-sized modified texture both block export |
| Logos/layout | Custom uploaded logo on both requested faces; empty name preserved; no automatic replacement ink |
| Physical PDF dimensions | Both pages have exact 85.6 × 54 mm trim; optional inset checked separately |
| PDF pixel identity | Decoded RGB of both pages exactly equals the matching archived PNG pixels, in front/back order |
| Archive | All eight artwork/notes files verified independently using Python zipfile/hashlib/Pillow/pypdf |
| Mobile/export state | No horizontal overflow; changed settings disable stale export |
| Static checks | Lint, TypeScript and diff checks pass |
| Local production build | Turbopack succeeds with persistent build cache temporarily disabled; temporary configuration restored |
| Review | No actionable P0/P1/P2 findings in integrity and lossless-PDF changes |

The local persistent Turbopack cache failed to open. The alternate Webpack build also exposed an existing client import of `node:crypto` through checkout/profile validation; that unrelated import was not changed. The successful build above used the project's normal Turbopack compiler with only its persistent cache disabled for that run.

Browser data is injected at the admin API boundary. This verifies the actual rendering and downloaded bytes, not a signed-in live checkout/database journey. No production data was modified.

## Next steps required for reliable customer-to-factory matching

1. **Freeze at customer confirmation.** Save private, immutable front/back PNG masters from the customer's final proof, with the precise configuration, texture versions/hashes, renderer version and print geometry. Reprints use those masters directly; edits create a new revision.
2. **Record approval.** Show the exact flat front/back proof to the customer and store approval against that master fingerprint. Changing any approved design or production geometry invalidates approval.
3. **Lock typography.** Use a licensed, self-hosted canonical font or preserve text as outlines. Current legacy Helvetica/Arial system stacks can resolve differently on different machines. Raster archives preserve whichever glyphs were actually exported, but cannot prove what an old customer saw.
4. **Calibrate the physical template.** Measure the actual NFC blank's corner radius and sticker inset; approve a 1:1 cut/fit sample and front/back orientation before bulk printing. 85.6 × 54 mm is confirmed; corner radius is still provisional.
5. **Approve colour and finish.** Agree printer colour handling/ICC profile, sticker stock and matte laminate. Screen RGB, paper, ink and lamination cannot be promised to match physically without a sample.

Older designs did not store exact artwork masters or texture/font versions. Their historical appearance remains unverified. Do not label a newly regenerated legacy design as a proven 100% match.

Recovery Preview only. Payments, production, database schemas and customer records unchanged.
