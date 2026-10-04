# IQ Card — October production-readiness tracker

Working week: **5–11 October 2026**. Work began 4 October.

Goal: verify each customer journey from Atelier design through authentication,
profile publication, payment, fulfillment and physical NFC use. Every card
configuration has a **₹799 card subtotal**; shipping and tax remain business decisions.

## Baseline reconciled on 4 October

- Repository: `nikhilr234-stack/IQCard-site`, production branch `main`.
- Production project: **iqcard-app** (`prj_PNfMNtSsskNXGwkSe2G2QkuR2swn`).
- Production baseline: `724dca41aad5f70ce0f2caa4314fd4a370ebe234`, Ready deployment
  `dpl_45uwa4N5sypqVLpu3f9gYm72YqcF`; `iqcard.in` is a verified project domain.
- Paid-order preview remains separate: branch `codex/iqcard-paid-card-launch-20261003`,
  SHA `92412ee0247469cea7700c4a33781fab6663982e`, Ready deployment
  `dpl_CpYmDM956F5HdYEWSw3HYJALDp8W`. Do not merge commerce to fix registration.
- Production Supabase: `vscmmhpfuozyvangkmhq`; isolated sandbox: `zlmiiyuhuqmmrfcpzsxe`.
- Do not rerun applied migrations or manage deployments through `iq-card-site`.

## Acceptance schedule

| Flow | Target | Current verification boundary | Acceptance evidence required |
|---|---|---|---|
| 1. Design → email → dashboard | Mon 5 | Partial; local recovery failure reproduced live | Actual delivered link, matching claimed design on desktop/mobile; another-device, expired/reused-link and resend checks |
| 2. Returning customer/recovery | Mon 5 | Partial | Logout/login, refresh and fresh-device ownership; real customer recovery confirmation; multiple-design selection |
| 3. Refinement/fidelity | Tue 6 | API checks passed previously | Actual dashboard → Atelier → edit/save/reopen; all fields and custom logos match; order snapshot stays fixed |
| 4. Digital profile | Wed 7 | Application journey unverified | Identity/contact/links/images/template edit → save/refresh → publish/update/unpublish viewed signed out |
| 5. Checkout | Thu 8 | Implemented on separate commerce branch; blocked | Exact design, ₹799 subtotal, approved final total, address validation, retry/resume and ownership checks |
| 6. Payment | Thu 8 | Sandbox configuration blocker | Test Razorpay order/payment and signed webhook; replay/cancel/fail/delay checks produce exactly one verified paid order |
| 7. Order dashboard/email | Fri 9 | Full deployed journey unverified | Correct snapshot, amount, address/status; approved sender delivery/retry; account isolation |
| 8. Fulfillment | Fri 9 | Operational journey unverified | Paid order → prerequisites → production → tracking/shipping/delivery; admin permissions and invalid transitions |
| 9. Physical NFC/QR | Sat 10 | Requires physical testing | Approved manufactured design; stable URL; iPhone/Android tap, QR fallback, links and Save Contact |
| 10. Existing/gifted cards | Sat 10 | Regression verification required | Existing URLs/settings/images, prepared gift profile, correct claim and recipient editing; reject wrong/duplicate claims |
| 11. Support/recovery | Sat 10 | Incomplete | Clear account/payment recovery, support contact and approved cancellation/refund/replacement paths |
| 12. Production release | Sun 11 | Not ready | All required journeys, migration/grant coverage, policies, business rules, live credentials/gates, monitoring, backup/rollback and authorized live smoke test |

Status vocabulary: **implemented**, **checks passed**, **deployed**, **verified**,
**blocked**. Passing tests or a Ready deployment do not establish journey completion.
Sunday is a readiness review, not a promised launch.

## First repair: return to the submitted design

Live reproduction on 4 October:

1. Created and manually saved an Ivory Marble card named `October Recovery`.
2. Opened `/register/check-email` and clicked **Return to your saved card**.
3. Observed `/customize` showing a fresh `YOUR NAME` default at the Core step.

The reproduction did **not** submit a registration or send an email. It verifies
the broken return navigation independently of email delivery.

Repair on `codex/october-registration-recovery-20261004`:

- Registration recovery and request-another-link navigation use `/customize?restore=1`.
- Submission checkpoints the exact configuration and its design reference before
  requesting the email; persistence failure prevents the request.
- Recovery uses the reference to select the matching usable local design and opens review.
- Missing/corrupt references, missing configuration or another browser show explicit
  recovery instructions and dashboard/new-card paths. Never substitute another card.
- Startup disables autosaving until initialization/recovery succeeds.
- Authentication, database schema and commerce gates are unchanged.

Behavioral regressions exercise the actual Atelier script, including exact material,
identity/placement, unrelated history, missing records/references/configuration and
storage failures. Owner preview/resume coverage remains in the same suite.

## Remaining prerequisites

- Dedicated mailbox for actual delivered-link verification; no mailbox/password/token
  access is requested through chat. A controlled API fixture is not email verification.
- Existing recovered customer's sign-in/dashboard/refinement confirmation.
- Correct Razorpay Test Mode configuration in the dedicated commerce preview; keep
  live checkout disabled until the production release gate is deliberately completed.
- Confirm fresh-install migration fixes and PUBLIC execution grants are captured.
- Approve GST inclusion, shipping/service regions, delivery estimate, support contact,
  refund/replacement rules, email sender, production/dispatch owner and manufacturing output.

## Execution record

Append a row after each acceptance run, with commit/deployment identifiers and actual
observations. Preserve unresolved limitations when another chat resumes.

| Flow | Status | Evidence | Remaining blocker | Owner action |
|---|---|---|---|---|
| 1 recovery navigation | Implemented; checks passed; preview deployed | PR #9; code SHA `245eeccb83015de637592240e1d9d05ad888b52d`; 108 test files / 779 tests, lint, TypeScript and production build passed; independent review cleared; Ready preview `dpl_DNB3VcSBfr9m8q4vngQZfUgAuJfx` | Deployed browser verification blocked by automatic approval review of temporary preview access; production unchanged | Authorize use of the protected preview's temporary Vercel access link |
| 1 delivered-link journey | Blocked | Previous authentication/API fixtures only | Dedicated real mailbox and delivered link run | Provide a test mailbox to use and verify delivery locally |
| 5–6 payment | Blocked | Handoff records `checkout-disabled` / `sandbox-only` gate | Valid Test Mode provider configuration | Enter secrets directly in provider interface |

The preview browser action was rejected specifically because the temporary
Vercel share link bypasses preview authentication and that access method had
not been expressly authorized. Do not work around this rejection. Obtain explicit
approval for that method, or use an authorized normal preview sign-in path.

Production has not been changed by this repair. The real-email journey,
signed-in dashboard and mobile visual acceptance are still open.
