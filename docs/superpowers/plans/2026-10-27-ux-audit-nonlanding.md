# Non-landing UX audit implementation plan

**Goal:** Address the accepted IQ Card audit sequentially, leaving all landing files to the other task.
**Spec:** IQCard-UX-Audit.md, Library libfile_67d2b3e8f8b481919fb403cc87b45d75.
**Architecture:** Preserve Next/React, server authorization, atomic profile saving and the shared PublicProfile renderer. Use production commit fc2a274 as the base for general fixes. Keep payment changes on the existing paid preview lineage.
**Constraints:** No landing changes; no production merge/deploy; no invented support address or manufacturing claims; no authentication bypass. Mark homepage 01–03 delegated, not runtime verified. Existing single-name validation and paginated print loading must be checked before changing them.

## Tasks
- [x] 1. Dashboard: state-derived publication badges/copy/share controls, real unpublish action, useful modules first. Test draft and published rendering and server-action wiring.
- [x] 2. Editor: in-memory full preview, persistent save bar, unsaved navigation/reload protection, mobile Edit/Preview controls, readable text and touch targets. Test preview without save/publish, failed save retaining edits and guard activation.
- [x] 3. Onboarding: shared public preview with stored presentation; contact input semantics and explicit 12-link limit. Test server data wiring and rendered controls.
- [x] 4. Recovery/customizer: persist same-tab resend request without tokens, retry through existing rate-limited handoff endpoint, masked email/change-email path, honest signup CTA, early price, radio semantics, logo-control clarity. Preserve saved designs and rotation. Test resend failures, missing request and validation.
- [x] 5. Public/admin: preserve profile layouts, provide compact default cover placement, actionable gift-conflict recovery, truthful analytics date scope, verify exhaustive print source pagination. Test relevant repository and route suites.
- [x] 6. Paid branch: inspect checkout service before allowing unpaid address correction, order-specific retry, accurate NFC readiness copy, bounded pending recovery. Preserve webhook payment authority and immutable paid orders.
- [ ] 7. Verification: targeted tests per behavioural change, full suite, lint/typecheck/build, review changed files, update master audit with evidence and open blockers. Push isolated review branches/PRs if available; main stays unchanged.

## Review focus
- Draft profiles must never be advertised as public.
- Preview must not save or publish as a side effect.
- Save failures must leave the draft dirty and recoverable.
- Resend must retain exact design and rate-limit/ownership protections.
- Payment changes must not unlock paid-order mutation or infer paid status client-side.

## Progress and rulings
- Setup: user explicitly authorized execution of all non-landing audit tasks; no further design approval needed for these scoped corrections.
- Base: confirmed production is fc2a274; homepage work is a separate preview branch.
- Existing fix: production print repository already pages all sources in 500-row batches. Audit item 34 was stale against production and needs correction, not a duplicate rewrite.
- Existing fix: production registration validator already accepts single names; customizer guidance still needs checking.

## Verification ledger — 28 October 2026
- General changes: 866 automated tests passed; lint passed; production build passed after correcting a generic TypeScript record annotation. Additional radio/Atelier targeted suite: 17 passed.
- Payment changes: 845 automated tests passed; lint passed; production build verification runs separately in the paid worktree.
- Independent review found three important edge cases: stale recovery after reverting, recovery after independently persisted media/normalized saves, and cancel/edit races during a delivery PATCH. All were corrected and covered by regression tests.
- Ruling: Single-name acceptance was reverted after confirming downstream SQL publication and profile-save constraints still require two-part names. The UI now explains the constraint. Item 08 remains open pending a coordinated schema change.
- Ruling: The Share & QR section was renamed Share link; no QR promise is made without a QR feature.
- Ruling: Unavailable dashboard modules were moved into a collapsed Upcoming features area. They are not presented as active analytics.
- Ruling: Recovery performs a field-level three-way merge against current server data and flags conflicts for explicit owner review before save. Recovery never publishes automatically.
- Ruling: No fabricated support address was added. Gift conflict recovery points to the existing gift and owner dashboard and asks the sender for help; a verified support channel remains open.
- Homepage 01–03: handled externally at user request. No landing files changed.
- Runtime gates remain open: authenticated browser/mobile screenshots, actual email delivery, sandbox PATCH/payment/webhook flows, public contact export and print proof. Neither branch is production-ready solely because local checks pass.


## October review integration — 28 October 2026
- User selected and authorized push to `codex/october-registration-recovery-20261004`, starting at `22fc866`. Integrate targeted fixes without replacing this newer branch with the earlier production baseline.
- Preserve admin-only publication and its SQL boundary, explicit sign-out controls, bare-domain link normalization, original server-authoritative registration resend endpoint, frozen card snapshots/price and order-specific initialRequestKey, founding profiles, existing payment reconciliation and all print renderer assets.
- Resend UX now decorates the existing `/api/registration/resend` flow with a masked destination and an exact-saved-card change-email path. It does not reconstruct or overwrite the saved design during resend.
- Port the deployed all-pages print repository and tests to this selected branch, where the 100-row/account-linked-only restriction was still present. Keep its existing print renderer intact.
- Combined suite: 1,111 tests passed. TypeScript and lint passed. Production build verification performed before push.
- Independent integration review found no important new regressions in admin approval, resend authority, frozen-order recovery, atomic unpaid delivery correction or reconciliation. Live backend/mobile checks remain separate.
- Keep main, the separate homepage task and production deployments untouched. Push is a normal fast-forward to the exact user-selected remote branch; never force-push.
