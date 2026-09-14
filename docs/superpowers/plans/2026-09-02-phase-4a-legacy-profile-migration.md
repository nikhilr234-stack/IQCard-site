# Phase 4A Legacy Profile Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dry-run-first, idempotent importer that moves email-bearing legacy IQ Card profiles into draft Supabase profiles without touching legacy files or sending invitations.

**Architecture:** Keep parsing and validation pure in `src/lib/migration`, isolate Supabase calls behind a small adapter, and expose a local Node CLI with explicit `--dry-run` (default) and `--import` modes. The importer matches records only to existing Auth users, creates draft profiles and private photo objects, and reports unresolved records without guessing or writing.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Node 24 `--experimental-strip-types`, `@supabase/supabase-js` service-role client, existing profile validation/link helpers.

**Spec:** `docs/superpowers/specs/2026-09-02-phase-4a-legacy-profile-migration-design.md`

## Global Constraints

- Canonical sources are root-level profile files/folders; never import `IQCard-site-git/`.
- Profiles without a source email (`Ashwin`, `Nikki`) remain unchanged.
- Every imported profile is created with `status = 'draft'` and `published_at = null`.
- The first implementation never sends invitations, silently creates Auth users, publishes profiles, or overwrites existing profiles.
- Never print service-role keys, access tokens, or private absolute file paths.
- The default CLI mode is dry-run; database/storage writes require an explicit `--import` flag.
- Use the existing profile/link validation rules and preserve source ordering deterministically.

---

### Task 1: Build the pure VCF and legacy-record parser

**Files:**
- Create: `src/lib/migration/legacy-profile.ts`
- Create: `src/lib/migration/legacy-profile.test.ts`

**Interfaces:**
- `parseVCard(text: string): LegacyContact`
- `normalizeLegacyContact(contact: LegacyContact, sourceSlug: string): LegacyProfileDraft | LegacyParseIssue[]`
- `LegacyContact = { fullName: string; email: string | null; phone: string | null; headline: string | null; bio: string | null; urls: Array<{ label: string; url: string }> }`
- `LegacyParseIssue = { field: string; message: string }`
- `LegacyProfileDraft = { sourceSlug: string; fullName: string; email: string | null; phone: string; headline: string; bio: string; slug: string; links: Array<{ label: string; url: string }>; photoFileName: string | null }`

- [ ] **Step 1: Write the failing parser tests**

```ts
it('parses escaped VCF fields and normalizes email/phone/url values', () => {
  const result = parseVCard(`BEGIN:VCARD\nFN:Tejashree Pradhap\nTITLE:Urban Planner / Architect\nTEL;TYPE=CELL:+917259706185\nEMAIL:TEJU2344@GMAIL.COM\nURL:https://www.linkedin.com/in/tejashree-pradhap-843b01253/\nNOTE:Exploring cities\; through design\nEND:VCARD`)
  expect(result).toEqual({
    fullName: 'Tejashree Pradhap',
    email: 'teju2344@gmail.com',
    phone: '+917259706185',
    headline: 'Urban Planner / Architect',
    bio: 'Exploring cities; through design',
    urls: [{ label: 'URL', url: 'https://www.linkedin.com/in/tejashree-pradhap-843b01253/' }],
  })
})

it('reports a missing email without inventing an owner', () => {
  const draft = normalizeLegacyContact(parseVCard('BEGIN:VCARD\nFN:Ashwin Reddy\nTEL:+919740909602\nEND:VCARD'), 'ashwin')
  expect(draft).toMatchObject({ email: null, sourceSlug: 'ashwin' })
})
```

- [ ] **Step 2: Run the focused tests and verify they fail**

Run: `node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/lib/migration/legacy-profile.test.ts`

Expected: FAIL because the parser module and functions do not exist.

- [ ] **Step 3: Implement minimal parsing and normalization**

Parse unfolded VCF lines, split the first colon, remove `;TYPE=...` parameters from field names, unescape `\\n`, `\\,`, `\\;`, and `\\\\`, lowercase/trim email, preserve the first phone, map `TITLE` to headline, `NOTE` to bio, and map URL parameters to readable labels.

- [ ] **Step 4: Run focused tests and then the full unit suite**

Run the focused command above, then `node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run`.

Expected: parser tests and all existing tests pass.

### Task 2: Discover canonical sources and produce a deterministic inventory

**Files:**
- Create: `src/lib/migration/legacy-sources.ts`
- Create: `src/lib/migration/legacy-sources.test.ts`
- Modify: `src/lib/migration/legacy-profile.ts`

**Interfaces:**
- `discoverLegacySources(rootDir: string): LegacySource[]`
- `LegacySource = { sourceSlug: string; htmlPath: string | null; htmlText: string | null; vcardPath: string; vcardText: string; photoPath: string | null }`
- `buildMigrationRecords(sources: LegacySource[]): MigrationRecord[]`
- `MigrationRecord = { sourceSlug: string; source: LegacySource; draft: LegacyProfileDraft; state: 'ready' | 'missing-email' | 'invalid' | 'conflict' }`

- [ ] **Step 1: Write failing inventory tests**

```ts
it('ignores the archived duplicate directory', () => {
  const records = discoverLegacySources('/workspace')
  expect(records.every((record) => !record.vcardPath.includes('/IQCard-site-git/'))).toBe(true)
})

it('marks Ashwin as missing-email and keeps the folder slug', () => {
  const record = buildMigrationRecords([{
    sourceSlug: 'ashwin',
    htmlPath: '/workspace/Ashwin/index.html',
    htmlText: null,
    vcardPath: '/workspace/Ashwin/ashwin.vcf',
    photoPath: null,
    vcardText: 'BEGIN:VCARD\\nFN:Ashwin Reddy\\nTEL:+919740909602\\nEND:VCARD',
  }])[0]
  expect(record.sourceSlug).toBe('ashwin')
  expect(record.state).toBe('missing-email')
  expect(record.draft.slug).toBe('ashwin')
})
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/lib/migration/legacy-sources.test.ts`

Expected: FAIL because source discovery is not implemented.

- [ ] **Step 3: Implement canonical source discovery**

Scan only the repository root for known profile directories and root-level VCF files, pair nested/root VCFs with their folder, detect a same-folder photo when present, and explicitly exclude `IQCard-site-git`, `node_modules`, `.next`, and non-profile landing-page assets. Preserve the approved slug mapping from the spec and stop on slug collisions.

- [ ] **Step 4: Verify the inventory against the approved list**

Run the focused test and a local dry inventory command. Expected result: 13 email-bearing eligible records, 2 `missing-email` records (`ashwin`, `nikki`), and no archive duplicates.

### Task 3: Add a testable import service with no-overwrite behavior

**Files:**
- Create: `src/lib/migration/legacy-importer.ts`
- Create: `src/lib/migration/legacy-importer.test.ts`
- Modify: `src/lib/profile/validation.ts` (only if a shared link-label helper is required)

**Interfaces:**
- `LegacyImportStore` methods:
  - `findAuthUserByEmail(email: string): Promise<{ id: string; email: string } | null>`
  - `findProfileByOwner(ownerId: string): Promise<{ id: string; slug: string } | null>`
  - `findProfileBySlug(slug: string): Promise<{ id: string; ownerId: string } | null>`
  - `createProfile(input: NewProfileInput): Promise<{ id: string }>`
  - `createLinks(profileId: string, links: Array<{ label: string; url: string }>): Promise<void>`
  - `uploadPhoto(path: string, contents: Uint8Array, contentType: string): Promise<void>`
  - `readPhoto(path: string): Promise<{ contents: Uint8Array; contentType: string } | null>`
- `NewProfileInput = { owner_id: string; slug: string; status: 'draft'; published_at: null; full_name: string; headline: string; tagline: string; bio: string; phone: string; email: string }`
- `runLegacyImport(records: MigrationRecord[], store: LegacyImportStore, mode: 'dry-run' | 'import'): Promise<ImportSummary>`
- `ImportSummary = { ready: string[]; imported: string[]; pendingAccount: string[]; missingEmail: string[]; conflicts: string[]; failed: Array<{ slug: string; reason: string }> }`

- [ ] **Step 1: Write failing importer tests**

```ts
const readyRecord: MigrationRecord = {
  sourceSlug: 'teju',
  source: { sourceSlug: 'teju', htmlPath: null, htmlText: null, vcardPath: '/workspace/teju.vcf', vcardText: '', photoPath: null },
  draft: {
    sourceSlug: 'teju', slug: 'teju', fullName: 'Tejashree Pradhap', email: 'teju2344@gmail.com',
    phone: '', headline: 'Urban Planner / Architect', bio: '', links: [], photoFileName: null,
  },
  state: 'ready',
}

it('reports a missing Auth account without writing anything', async () => {
  const store = fakeStore({ authUser: null })
  const summary = await runLegacyImport([readyRecord], store, 'import')
  expect(summary.pendingAccount).toEqual(['teju'])
  expect(store.createdProfiles).toHaveLength(0)
})

it('creates a draft profile and links for a matched account', async () => {
  const store = fakeStore({ authUser: { id: 'user-1', email: 'teju2344@gmail.com' } })
  const summary = await runLegacyImport([readyRecord], store, 'import')
  expect(summary.imported).toEqual(['teju'])
  expect(store.createdProfiles[0]).toMatchObject({ owner_id: 'user-1', slug: 'teju', status: 'draft', published_at: null })
})

it('does not overwrite an existing owner profile', async () => {
  const store = fakeStore({ authUser: { id: 'user-1', email: 'teju2344@gmail.com' }, existingProfile: { id: 'profile-1', slug: 'teju' } })
  const summary = await runLegacyImport([readyRecord], store, 'import')
  expect(summary.conflicts).toEqual(['teju'])
  expect(store.createdProfiles).toHaveLength(0)
})
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/lib/migration/legacy-importer.test.ts`

Expected: FAIL because the import service is not implemented.

- [ ] **Step 3: Implement dry-run and import modes**

Dry-run performs validation and account/profile conflict checks only. Import creates one draft profile per matched account, inserts deterministic links, uploads a local photo under `<ownerId>/legacy/<filename>`, and never publishes. Stop before writes for missing account, missing email, invalid fields, duplicate slug, or existing owner profile.

- [ ] **Step 4: Verify importer tests pass**

Run the focused importer command, then the complete Vitest suite. Expected: all importer and existing tests pass.

### Task 4: Implement the local migration CLI and Supabase adapter

**Files:**
- Create: `src/lib/migration/cli.ts`
- Create: `src/lib/migration/legacy-cli.test.ts`
- Create: `scripts/migrate-legacy-profiles.ts`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `supabase/README.md`

**Interfaces:**
- CLI flags: `--dry-run` (default), `--import`, `--slug <slug>` (repeatable), and `--json`.
- `createSupabaseLegacyImportStore(): LegacyImportStore` uses the service-role client and Auth admin API; it must not be imported by browser or app routes.

- [ ] **Step 1: Write a CLI argument test**

Add a pure `parseMigrationArgs(argv: string[])` helper in `src/lib/migration/cli.ts` and test that no flag defaults to `{ mode: 'dry-run', slugs: [], json: false }`, while `--import --slug teju --json` parses as expected.

- [ ] **Step 2: Run the focused argument test and verify failure**

Run: `node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run src/lib/migration/legacy-cli.test.ts`

Expected: FAIL until the argument parser exists.

- [ ] **Step 3: Implement the CLI and adapter**

Load `.env.local` with Node's `--env-file=.env.local`, resolve the repository root from `import.meta.dirname`, build the canonical inventory, print redacted counts by state, and require `--import` for all writes. The Supabase adapter lists Auth users by page, matches normalized email, queries profiles by owner/slug, inserts draft rows, inserts links, and uploads photos to the private `profile-images` bucket.

- [ ] **Step 4: Add package commands and documentation**

Add:

```json
"migrate:legacy": "node --env-file=.env.local --experimental-strip-types scripts/migrate-legacy-profiles.ts"
```

Document these commands:

```bash
npm run migrate:legacy -- --dry-run
npm run migrate:legacy -- --dry-run --slug teju --json
npm run migrate:legacy -- --import --slug teju
```

State explicitly that the first import does not send invitations and that pending accounts are onboarded through `/admin` before rerunning.

- [ ] **Step 5: Run a real dry run and inspect the summary**

Run: `npm run migrate:legacy -- --dry-run`

Expected: no database/storage writes, 13 email-bearing records listed as eligible or pending-account depending on current Auth users, and `ashwin`/`nikki` reported as missing-email.

### Task 5: Final verification and migration handoff

**Files:**
- Modify: `README.md` (migration status and rollback notes)
- Create: `docs/superpowers/plans/2026-09-02-phase-4a-legacy-profile-migration-verification.md`

- [ ] **Step 1: Run all automated checks**

Run:

```bash
node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/vitest/vitest.mjs run
node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/typescript/bin/tsc --noEmit
node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/eslint/bin/eslint.js src
node /Users/soumyar/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node node_modules/next/dist/bin/next build
```

Expected: all tests pass, type-check/lint exit 0, and production build succeeds.

- [ ] **Step 2: Run and record the dry-run output**

Record only redacted counts, slugs, and states in the verification note. Do not include service-role keys, access tokens, or full private file paths.

- [ ] **Step 3: Review imported drafts in `/admin`**

For each imported record, verify owner email, name, headline, contact details, links, slug, photo, and `draft` status. Do not publish until the client has reviewed the content.

- [ ] **Step 4: Document rollback scope**

Record the IDs/storage paths created by the import run and confirm legacy files remain untouched. If a rollback is needed, delete only those newly-created draft rows/objects.
