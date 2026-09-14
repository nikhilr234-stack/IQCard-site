# Task 1 report: presentation settings and normalization

## Implementation

- Added `ProfileTemplate`, `CoverPresentation`, and `ProfilePresentation` to the shared profile types.
- Added `DEFAULT_PRESENTATION` with Minimal defaults for both draft and published snapshots.
- Added pure `normalizePresentation(input)` with object guards, template/alignment fallbacks, path normalization, and clamping for overlay (`0.15–0.70`) and focal position (`0–100`). Draft and published settings are normalized independently, preserving Cover settings even when the selected template is Minimal.
- Added `resolvePresentation(presentation, mode)` for selecting the draft or published snapshot.

## RED/GREEN evidence

- RED: before `presentation.ts` existed, the targeted Vitest run failed during collection with `Cannot find module './presentation'`.
- GREEN: after implementation, `src/lib/profile/presentation.test.ts` passed all 3 tests.

## Tests

- `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ../../node_modules/.bin/vitest run src/lib/profile/presentation.test.ts` — 3 passed.
- `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ../../node_modules/.bin/vitest run src/lib/profile/*.test.ts` — 81 passed.
- `PATH=/Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/bin:/bin ../../node_modules/.bin/tsc --noEmit` — passed.

## Changed files

- `src/lib/profile/types.ts`
- `src/lib/profile/presentation.ts`
- `src/lib/profile/presentation.test.ts`

## Self-review

- Normalization does not mutate input objects.
- Unknown or malformed top-level and nested values fall back safely.
- Draft and published snapshots do not share mutable normalized objects.

## Concerns

- `profile_id` is optional in the normalized TypeScript model because callers may normalize legacy/partial JSON before associating it with a profile. Persistence code can require it at its database boundary.
