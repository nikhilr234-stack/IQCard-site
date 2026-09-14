import { basename } from 'node:path'
import type { MigrationRecord } from './legacy-sources.ts'

export type NewProfileInput = {
  owner_id: string
  slug: string
  status: 'draft'
  published_at: null
  full_name: string
  headline: string
  tagline: string
  bio: string
  phone: string
  email: string
}

export type ProfileUpdateInput = {
  photo_path: string | null
}

type ExistingOwnerProfile = {
  id: string
  slug: string
  status: 'draft' | 'published'
}

type ExistingSlugProfile = ExistingOwnerProfile & {
  ownerId: string
}

export type LegacyImportStore = {
  findAuthUserByEmail(email: string): Promise<{ id: string; email: string } | null>
  findProfileByOwner(ownerId: string): Promise<ExistingOwnerProfile | null>
  findProfileBySlug(slug: string): Promise<ExistingSlugProfile | null>
  createProfile(input: NewProfileInput): Promise<{ id: string }>
  updateProfile(profileId: string, values: ProfileUpdateInput): Promise<void>
  createLinks(profileId: string, links: Array<{ label: string; url: string }>): Promise<void>
  readPhoto(path: string): Promise<{ contents: Uint8Array; contentType: string } | null>
  uploadPhoto(path: string, contents: Uint8Array, contentType: string): Promise<string>
}

export type ImportSummary = {
  ready: string[]
  imported: string[]
  pendingAccount: string[]
  missingEmail: string[]
  conflicts: string[]
  failed: Array<{ slug: string; reason: string }>
}

function emptySummary(): ImportSummary {
  return { ready: [], imported: [], pendingAccount: [], missingEmail: [], conflicts: [], failed: [] }
}

export async function runLegacyImport(
  records: MigrationRecord[],
  store: LegacyImportStore,
  mode: 'dry-run' | 'import',
): Promise<ImportSummary> {
  const summary = emptySummary()

  for (const record of records) {
    if (record.state === 'missing-email') {
      summary.missingEmail.push(record.sourceSlug)
      continue
    }
    if (record.state !== 'ready' || !record.draft.email) {
      summary.failed.push({ slug: record.sourceSlug, reason: record.issues?.map((issue) => issue.message).join('; ') || 'Invalid legacy profile' })
      continue
    }

    const authUser = await store.findAuthUserByEmail(record.draft.email)
    if (!authUser) {
      summary.pendingAccount.push(record.sourceSlug)
      continue
    }

    const existingOwnerProfile = await store.findProfileByOwner(authUser.id)
    const existingSlugProfile = await store.findProfileBySlug(record.draft.slug)
    const resumableOwnerProfile = existingOwnerProfile?.slug === record.draft.slug && existingOwnerProfile.status === 'draft'
      ? existingOwnerProfile
      : null
    const resumableSlugProfile = existingSlugProfile?.ownerId === authUser.id && existingSlugProfile.status === 'draft'
      ? existingSlugProfile
      : null
    const hasConflictingOwner = Boolean(existingOwnerProfile && !resumableOwnerProfile)
    const hasConflictingSlug = Boolean(existingSlugProfile && !resumableSlugProfile)
    const hasInconsistentResumeTargets = Boolean(
      resumableOwnerProfile && resumableSlugProfile && resumableOwnerProfile.id !== resumableSlugProfile.id,
    )
    if (hasConflictingOwner || hasConflictingSlug || hasInconsistentResumeTargets) {
      summary.conflicts.push(record.sourceSlug)
      continue
    }

    summary.ready.push(record.sourceSlug)
    if (mode === 'dry-run') continue

    try {
      let profile: { id: string } | null = resumableOwnerProfile ?? resumableSlugProfile
      if (!profile) {
        profile = await store.createProfile({
          owner_id: authUser.id,
          slug: record.draft.slug,
          status: 'draft',
          published_at: null,
          full_name: record.draft.fullName,
          headline: record.draft.headline,
          tagline: '',
          bio: record.draft.bio,
          phone: record.draft.phone,
          email: record.draft.email,
        })
      }
      await store.createLinks(profile.id, record.draft.links)
      if (record.source.photoPath) {
        const photo = await store.readPhoto(record.source.photoPath)
        if (photo) {
          const storedPath = await store.uploadPhoto(
            `${authUser.id}/legacy/${basename(record.source.photoPath)}`,
            photo.contents,
            photo.contentType,
          )
          await store.updateProfile(profile.id, { photo_path: storedPath })
        }
      }
      summary.imported.push(record.sourceSlug)
    } catch (error) {
      summary.failed.push({ slug: record.sourceSlug, reason: error instanceof Error ? error.message : 'Import failed' })
    }
  }

  return summary
}
