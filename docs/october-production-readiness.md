# IQ Card — October production-readiness tracker

Working week: **5–11 October 2026**. Work began 4 October.

Goal: verify each customer journey from Atelier design through authentication,
profile publication, payment, fulfillment and physical NFC use. Every card
configuration has a **₹799 card price**. **Shipping is charged separately** and added
to the checkout total. GST inclusion and any tax amount still need confirmation.

## Baseline reconciled on 4 October

- Repository: `nikhilr234-stack/IQCard-site`, production branch `main`.
- Production project: **iqcard-app** (`prj_PNfMNtSsskNXGwkSe2G2QkuR2swn`).
- Production baseline at start: `724dca41aad5f70ce0f2caa4314fd4a370ebe234`, Ready deployment
  `dpl_45uwa4N5sypqVLpu3f9gYm72YqcF`; `iqcard.in` is a verified project domain.
- The recovery-navigation repair was merged through PR #9 (`ed1dd0b299c66f622d60532e087089522440172e`) and is included in the current Ready production deployment of `main`, commit `a8c74e89b274b9de636e99f752bab70892821b83` (`dpl_jWHUsLDYDLFUGd8yGgWQmtvbeCjv`).
- Paid-order preview remains separate: branch `codex/iqcard-paid-card-launch-20261003`,
  SHA `92412ee0247469cea7700c4a33781fab6663982e`, Ready deployment
  `dpl_CpYmDM956F5HdYEWSw3HYJALDp8W`. Do not merge commerce to fix registration.
- Production Supabase: `vscmmhpfuozyvangkmhq`; isolated sandbox: `zlmiiyuhuqmmrfcpzsxe`.
- Do not rerun applied migrations or manage deployments through `iq-card-site`.

## Preview-only working boundary (5 October)

The user explicitly restricted this chat to `codex/october-registration-recovery-20261004` and sandbox `zlmiiyuhuqmmrfcpzsxe`. Do not change `main`, production deployments, production settings or the separate payment-testing branch.

- Recovery source `4cde25f70e1af26196ca190c697019c9954549b5` is deployed and Ready at `https://iqcard-5b4mi19zi-nikkis-projects-f42d2896.vercel.app`.
- Stable recovery branch alias: `https://iqcard-app-git-codex-october-re-8be149-nikkis-projects-f42d2896.vercel.app`.
- Five variables have been created specifically for this branch's Preview target: sandbox `NEXT_PUBLIC_SUPABASE_URL`, sandbox `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the stable branch alias as `NEXT_PUBLIC_SITE_URL`, a newly generated 32-byte `IQCARD_RATE_LIMIT_SECRET`, and `IQCARD_ONBOARDING_V2=true`.
- The public key was checked against the sandbox's active keys. Other branches' variables and all production variables were left unchanged.
- `SUPABASE_SERVICE_ROLE_KEY` and `IQCARD_ADMIN_EMAILS` are still absent from this branch's Preview scope. Vercel's sensitive value cannot be retrieved or copied through the connector. Add the sandbox service key directly in Vercel, and use a dedicated admin email distinct from the customer test mailbox `nrakesh@umich.edu`.
- New environment settings require a new Preview deployment. The earlier Ready deployment does not prove these settings or the customer journey work.
- Verify the sandbox Auth Site URL and allowed `/auth/confirm` and `/auth/callback` redirects use the stable recovery alias; verify the token-hash email template and actual delivery. Do not change production Auth settings.
- Full acceptance remains pending: delivered email, resend, cross-browser confirmation, exact design restoration, required identity, private submission, admin approval and signed-out publication.

## Acceptance schedule

| Flow | Target | Current verification boundary | Acceptance evidence required |
|---|---|---|---|
| 1. Design → email → profile setup → admin review | Mon 5 | Local fixes implemented; sandbox approval guard applied; preview journey pending | Exact saved design; fresh and resent links; required name/handle/details; private review queue; admin approval publishes; expired/reused-link and mobile checks |
| 2. Returning customer/recovery | Mon 5 | Partial | Logout/login, refresh and fresh-device ownership; real customer recovery confirmation; multiple-design selection |
| 3. Refinement/fidelity | Tue 6 | API checks passed previously | Actual dashboard → Atelier → edit/save/reopen; all fields and custom logos match; order snapshot stays fixed |
| 4. Digital profile | Wed 7 | Application journey unverified | Identity/contact/links/images/template edit → save/refresh → publish/update/unpublish viewed signed out |
| 5. Checkout | Thu 8 | Implemented on separate commerce branch; blocked | Exact design, ₹799 card price plus separately displayed shipping, final payable total, address validation, retry/resume and ownership checks |
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

The initial repair was merged through PR #9 and deployed on `main`. The recovery branch retains that repair and adds the following work:

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
- Confirm GST inclusion, shipping/service regions and fee, delivery estimate, support contact,
  refund/replacement rules, email sender, production/dispatch owner and manufacturing output.

## Execution record

Registration handoff repair in progress on `codex/october-registration-recovery-20261004`:

- New-account email callback continues at `/onboarding/identity`; name fields are required and invalid placeholder names are not carried through.
- The check-email screen resends from the current browser session against the saved design and email instead of sending the customer back through card design.
- Final onboarding submits a private profile for review; the admin client list labels completed private profiles `Review` and offers an approval action.
- Client self-publish controls are hidden in the digital-profile editor. Migration `20261005085331_require_admin_profile_approval` blocks client publication RPC calls; only the existing service-role admin publication path can publish.
- Before the source push, the full local suite passed: 787 tests, lint and TypeScript. The approval migration was applied only to isolated Supabase sandbox `zlmiiyuhuqmmrfcpzsxe`; a database query confirmed authenticated submission permission, no anon execution, and the client-publication guard. The merged recovery source is deployed to Preview at `4cde25f70e1af26196ca190c697019c9954549b5`. These newer changes have not been merged or deployed to production.

Append a row after each acceptance run, with commit/deployment identifiers and actual
observations. Preserve unresolved limitations when another chat resumes.

| Flow | Status | Evidence | Remaining blocker | Owner action |
|---|---|---|---|---|
| 1 recovery navigation | Implemented; checks passed; deployed; error path verified | PR #9; merge commit `ed1dd0b299c66f622d60532e087089522440172e`; 108 test files / 779 tests, lint, TypeScript and production build passed; independent review cleared; current Ready production deployment `dpl_jWHUsLDYDLFUGd8yGgWQmtvbeCjv` | Full delivered-email run, signed-in dashboard check and mobile visual acceptance remain open | Run the complete flow with a controlled test mailbox |
| 1 delivered-link journey | Blocked | Previous authentication/API fixtures only | Dedicated real mailbox and delivered link run | Provide a test mailbox to use and verify delivery locally |
| 5–6 payment | Blocked | Handoff records `checkout-disabled` / `sandbox-only` gate | Valid Test Mode provider configuration | Enter secrets directly in provider interface |

The production recovery error path is verified. The newer resend, required-identity,
private-submission and administrator-approval changes recorded above are deployed on the
recovery Preview branch. The full real-email journey, signed-in
dashboard and mobile visual acceptance remain open.
