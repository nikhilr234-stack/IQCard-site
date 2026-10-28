# Founding IQ Card profile restoration

Approved 9 October 2026: recover the 13 original public cards with their original
designs, details, outbound links and NFC URLs. Work remains on
`codex/october-registration-recovery-20261004` and Vercel `iqcard-app` Preview.

## Restored inventory

| Cardholder | Original URL | Portrait |
| --- | --- | --- |
| Infant Akash | `/infant` | Original |
| Aadhya Chintala | `/aadhya` | Original |
| Prerna Revankar | `/prerna` | Original |
| Hema Goyal | `/hema` | Original |
| Sharath Rao H N | `/sharath` | Original design has no portrait |
| Mithul Ravichandran | `/mithul` | Original design has no portrait |
| Naveen Samant | `/naveen` | Initials; original image absent from Git history |
| Rajesh Shetty | `/rajesh` | Original |
| Rakesh B S | `/rakesh` | Original design has no portrait |
| Ravichandra | `/ravichandra` | Initial; original image absent from Git history |
| Rohan Biligi | `/rohan` | Original design has no portrait |
| Tejashree Pradhap | `/teju` | Original |
| Ashwin Reddy | `/Ashwin` | Original design has no portrait |

## Implementation

The original files were outside Next.js `public`, while the public slug route
reads only published database profiles. This caused `/infant` to return 404
despite its archived HTML still existing in the repository.

Recovered public copies live under `public/founding-profiles`. Explicit rewrites
serve only the 13 founding URLs and their immediate assets before the dynamic
profile route. The original source files remain intact. Photos, logos and VCFs
are copied byte-for-byte; HTML local asset references are made absolute. The
displayed logo uses a shared URL across cards. Per-folder logo copies also retain
compatibility with the original asset URLs.
`/Ashwin` keeps its original case; Next's case-insensitive rewrite matching also
supports `/ashwin`. Contact downloads work for all 13 cards; Ashwin's existing
VCF is connected to a Save Contact button.

Founding slugs and the asset namespace are reserved in shared application
validation so unrelated accounts cannot choose URLs occupied by these cards.
This protection covers onboarding, dashboard validation and default draft
allocation. The database schema is unchanged.
Gift creation also checks reserved normalized names before media uploads and
before its transaction RPC; this prevents gifts from publishing hidden cards at
founder addresses when punctuation or non-Latin name tokens are stripped.

Existing update-request links use `/api/founding-profile-update`, which reads
the server-only administrator allowlist and opens a mailto draft. Four original
forms contained an unfinished external Formspree destination; their repaired
forms open the same draft, retaining entered update details. The button says
**Open Email Draft**. No request sends mail, stores submitted changes, or updates
a profile automatically. Support configuration must be present at runtime.

## Verification and limits

- Regression checks cover page identity, asset paths, contact downloads, rewrite
  scope, reserved founder slugs, support drafts and repaired forms.
- Full verification passed: 138 test files and 1,008 tests; review found no
  remaining Critical or Important issues.
- The optimized local build completed; lint and TypeScript passed.
- Local HTTP checks passed for all 13 root, trailing-slash and `index.html`
  addresses, 29 referenced image/contact assets, all 13 VCFs, the lowercase
  Ashwin alias, the existing customizer and five support form drafts.
- Original inline scripts and analytics/update modals were exercised in JSDOM
  during review. These legacy analytics retain their original local-browser
  behavior; they are not centralized account analytics.
- A visual browser run was unavailable because the Chromium download returned
  an invalid archive. Responsive visual review remains a Preview acceptance
  check; no browser layout or mobile-device verification is claimed.
- This restores public cards, not founder account ownership or dashboard editing.
  It does not modify production, Supabase data, payment gates or authentication.
- Restored routes take precedence over database profiles at those exact slugs.
  Any later migration to managed founder profiles must explicitly replace the
  appropriate static rewrite after matching ownership and verifying the new card.

Production release requires a separate explicit instruction. Before release,
review the Preview cards, supply the two missing portraits if available, and
confirm the deployed build and all original NFC destinations.
