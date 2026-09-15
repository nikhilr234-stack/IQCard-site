# Task 1: Client admin metadata migration

## Delivered

- Added `supabase/migrations/202609150003_add_client_admin_metadata.sql`.
  - Creates `public.client_admin_metadata`, keyed by `owner_id` with a cascading foreign key to `public.user_accounts(id)`.
  - Includes the `segment` default (`Unassigned`), invite timestamps, last-active timestamp, and created/updated timestamps.
  - Enables RLS, revokes raw table privileges from `public`, `anon`, and `authenticated`, and grants access to `service_role` only.
  - Attaches the existing `public.set_updated_at()` trigger function for updates.
  - Seeds every existing `user_accounts` row whose role is `client`, preserving any existing metadata with `ON CONFLICT DO NOTHING`.
- Added `src/lib/database/client-admin-metadata-migration.test.ts` to protect the migration contract.

## TDD evidence

1. Added the migration test before the migration existed.
2. Ran the focused test with the bundled Node runtime and the repository's installed Vitest:

   ```text
   node .../vitest.mjs run src/lib/database/client-admin-metadata-migration.test.ts
   ```

   It failed because `supabase/migrations/202609150003_add_client_admin_metadata.sql` did not exist (`ENOENT`).
3. Added the minimal migration and reran the same test: 3 tests passed.

## Verification

- `vitest run src/lib/database/client-admin-metadata-migration.test.ts`: 1 file, 3 tests passed.
- Full `vitest run`: 81 files, 527 tests passed.
- `git diff --check`: passed with no whitespace errors.

## Commit

`Add client admin metadata migration` (this task's final commit)

## Concerns

- The worktree does not contain `npm` or local `node_modules`; verification used the bundled Node runtime together with the checked-out repository's existing Vitest installation. No dependencies or lockfiles were changed.
- The migration intentionally has no browser-facing RLS policies. Supabase's `service_role` bypasses RLS and is the sole granted database role, while browser roles receive no raw table privileges.
