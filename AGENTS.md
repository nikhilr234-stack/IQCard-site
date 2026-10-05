<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## IQCard: Preview only

The user requires this chat's work to stay on the recovery Preview branch by default.

- Make edits, commits and pushes only on `codex/october-registration-recovery-20261004`.
- Before changing source, confirm the current branch with `git branch --show-current`.
- Do not switch to, commit to, push to or merge into `main`. Do not promote a deployment to production.
- Use Vercel project `iqcard-app`, Preview target, and environment variables scoped to the recovery branch. Leave other branch settings unchanged.
- Database work targets only Supabase sandbox `zlmiiyuhuqmmrfcpzsxe`. Never modify production project `vscmmhpfuozyvangkmhq` or rerun applied migrations.
- Keep payments disabled. A production change requires a new explicit instruction from the user; general permission does not override this Preview-only rule.
- Keep administrator addresses in the server-only environment allowlist; do not copy personal administrator addresses or secrets into repository files.

The current setup and remaining acceptance checks are recorded in `docs/october-production-readiness.md`.
