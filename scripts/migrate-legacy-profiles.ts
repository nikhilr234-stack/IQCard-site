import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMigrationArgs } from '../src/lib/migration/cli.ts'
import { discoverLegacySources, buildMigrationRecords, type MigrationRecord } from '../src/lib/migration/legacy-sources.ts'
import { runLegacyImport, type LegacyImportStore } from '../src/lib/migration/legacy-importer.ts'

const PROFILE_IMAGE_BUCKET = 'profile-images'

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function createSupabaseLegacyImportStore(): LegacyImportStore {
  const supabase = createClient(requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL'), requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return {
    async findAuthUserByEmail(email) {
      const perPage = 1000
      for (let page = 1; ; page += 1) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
        if (error) throw new Error(`Unable to list Auth users: ${error.message}`)
        const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
        if (match?.email) return { id: match.id, email: match.email }
        if (data.users.length < perPage) return null
      }
    },
    async findProfileByOwner(ownerId) {
      const { data, error } = await supabase.from('profiles').select('id,slug,status').eq('owner_id', ownerId).maybeSingle()
      if (error) throw new Error(`Unable to check profile owner: ${error.message}`)
      return data
    },
    async findProfileBySlug(slug) {
      const { data, error } = await supabase.from('profiles').select('id,slug,owner_id,status').eq('slug', slug).maybeSingle()
      if (error) throw new Error(`Unable to check profile slug: ${error.message}`)
      return data ? { id: data.id, slug: data.slug, ownerId: data.owner_id, status: data.status } : null
    },
    async createProfile(input) {
      const { data, error } = await supabase.from('profiles').insert(input).select('id').single()
      if (error || !data) throw new Error(`Unable to create profile: ${error?.message || 'no profile returned'}`)
      return data
    },
    async updateProfile(profileId, values) {
      const { error } = await supabase.from('profiles').update(values).eq('id', profileId)
      if (error) throw new Error(`Unable to update profile: ${error.message}`)
    },
    async createLinks(profileId, links) {
      const { error: deleteError } = await supabase.from('profile_links').delete().eq('profile_id', profileId)
      if (deleteError) throw new Error(`Unable to replace profile links: ${deleteError.message}`)
      if (!links.length) return
      const { error } = await supabase.from('profile_links').insert(links.map((link, sort_order) => ({ profile_id: profileId, label: link.label, url: link.url, sort_order })))
      if (error) throw new Error(`Unable to replace profile links: ${error.message}`)
    },
    async readPhoto(path) {
      const contents = await readFile(path)
      const extension = extname(path).toLowerCase()
      const contentType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg'
      return { contents, contentType }
    },
    async uploadPhoto(path, contents, contentType) {
      const { data, error } = await supabase.storage.from(PROFILE_IMAGE_BUCKET).upload(path, contents, { contentType, upsert: true })
      if (error || !data) throw new Error(`Unable to upload profile photo: ${error?.message || 'no path returned'}`)
      return data.path
    },
  }
}

function selectRecords(records: MigrationRecord[], slugs: string[]): MigrationRecord[] {
  if (!slugs.length) return records
  const requested = new Set(slugs)
  return records.filter((record) => requested.has(record.sourceSlug))
}

function printSummary(summary: Awaited<ReturnType<typeof runLegacyImport>>, json: boolean) {
  if (json) {
    console.log(JSON.stringify(summary, null, 2))
    return
  }
  console.log(`Ready: ${summary.ready.length}`)
  console.log(`Imported: ${summary.imported.length}`)
  console.log(`Pending account: ${summary.pendingAccount.length}`)
  console.log(`Missing email: ${summary.missingEmail.length}`)
  console.log(`Conflicts: ${summary.conflicts.length}`)
  console.log(`Failed: ${summary.failed.length}`)
  for (const [label, values] of Object.entries({ ready: summary.ready, imported: summary.imported, pendingAccount: summary.pendingAccount, missingEmail: summary.missingEmail, conflicts: summary.conflicts })) {
    if (values.length) console.log(`${label}: ${values.join(', ')}`)
  }
  for (const failure of summary.failed) console.log(`failed ${failure.slug}: ${failure.reason}`)
}

async function main() {
  const args = parseMigrationArgs(process.argv.slice(2))
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const records = selectRecords(buildMigrationRecords(discoverLegacySources(rootDir)), args.slugs)
  const summary = await runLegacyImport(records, createSupabaseLegacyImportStore(), args.mode)
  printSummary(summary, args.json)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration failed')
  process.exitCode = 1
})
