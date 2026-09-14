import { describe, expect, it } from 'vitest'
import {
  runLegacyImport,
  type LegacyImportStore,
  type NewProfileInput,
  type ProfileUpdateInput,
} from './legacy-importer'
import type { MigrationRecord } from './legacy-sources'

const readyRecord: MigrationRecord = {
  sourceSlug: 'teju',
  source: { sourceSlug: 'teju', htmlPath: null, htmlText: null, vcardPath: '/workspace/teju.vcf', vcardText: '', photoPath: null },
  draft: {
    sourceSlug: 'teju', slug: 'teju', fullName: 'Tejashree Pradhap', email: 'teju2344@gmail.com',
    phone: '', headline: 'Urban Planner / Architect', bio: '', links: [], photoFileName: null,
  },
  state: 'ready',
}

const photoRecord: MigrationRecord = {
  ...readyRecord,
  source: { ...readyRecord.source, photoPath: '/workspace/photos/teju.jpg' },
  draft: {
    ...readyRecord.draft,
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/teju' },
      { label: 'Portfolio', url: 'https://example.com/teju' },
    ],
    photoFileName: 'teju.jpg',
  },
}

type StoredProfile = {
  id: string
  ownerId: string
  slug: string
  status: 'draft' | 'published'
  photo_path?: string | null
}

function fakeStore(options: {
  authUser: { id: string; email: string } | null
  existingProfiles?: StoredProfile[]
  failReplaceLinks?: number
  failUploadPhoto?: number
  failUpdateProfile?: number
}): LegacyImportStore & {
  createdProfiles: NewProfileInput[]
  profileUpdates: Array<{ profileId: string; values: ProfileUpdateInput }>
  linksByProfile: Map<string, Array<{ label: string; url: string }>>
  uploadedFiles: Map<string, Uint8Array>
  uploadAttempts: string[]
} {
  const profiles = [...(options.existingProfiles ?? [])]
  let failReplaceLinks = options.failReplaceLinks ?? 0
  let failUploadPhoto = options.failUploadPhoto ?? 0
  let failUpdateProfile = options.failUpdateProfile ?? 0

  const store: LegacyImportStore & {
    createdProfiles: NewProfileInput[]
    profileUpdates: Array<{ profileId: string; values: ProfileUpdateInput }>
    linksByProfile: Map<string, Array<{ label: string; url: string }>>
    uploadedFiles: Map<string, Uint8Array>
    uploadAttempts: string[]
  } = {
    createdProfiles: [],
    profileUpdates: [],
    linksByProfile: new Map(),
    uploadedFiles: new Map(),
    uploadAttempts: [],
    async findAuthUserByEmail() { return options.authUser },
    async findProfileByOwner(ownerId) {
      const profile = profiles.find((candidate) => candidate.ownerId === ownerId)
      return profile ? { id: profile.id, slug: profile.slug, status: profile.status } : null
    },
    async findProfileBySlug(slug) {
      const profile = profiles.find((candidate) => candidate.slug === slug)
      return profile
        ? { id: profile.id, slug: profile.slug, ownerId: profile.ownerId, status: profile.status }
        : null
    },
    async createProfile(input) {
      store.createdProfiles.push(input)
      const profile = { id: `profile-${profiles.length + 1}`, ownerId: input.owner_id, slug: input.slug, status: input.status }
      profiles.push(profile)
      return { id: profile.id }
    },
    async updateProfile(profileId, values) {
      store.profileUpdates.push({ profileId, values })
      if (failUpdateProfile > 0) {
        failUpdateProfile -= 1
        throw new Error('profile update interrupted')
      }
      const profile = profiles.find((candidate) => candidate.id === profileId)
      if (profile && 'photo_path' in values) profile.photo_path = values.photo_path
    },
    async createLinks(profileId, links) {
      if (failReplaceLinks > 0) {
        failReplaceLinks -= 1
        throw new Error('link replacement interrupted')
      }
      store.linksByProfile.set(profileId, links.map((link) => ({ ...link })))
    },
    async readPhoto() { return { contents: new Uint8Array([1, 2, 3]), contentType: 'image/jpeg' } },
    async uploadPhoto(path, contents) {
      store.uploadAttempts.push(path)
      if (failUploadPhoto > 0) {
        failUploadPhoto -= 1
        throw new Error('photo upload interrupted')
      }
      store.uploadedFiles.set(path, contents)
      return `stored/${path}`
    },
  }
  return store
}

describe('legacy profile import', () => {
  it('reports a missing Auth account without writing anything', async () => {
    const store = fakeStore({ authUser: null })
    const summary = await runLegacyImport([readyRecord], store, 'import')
    expect(summary.pendingAccount).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(0)
  })

  it('creates a draft profile and replaces links for a matched account', async () => {
    const store = fakeStore({ authUser: { id: 'user-1', email: 'teju2344@gmail.com' } })
    const summary = await runLegacyImport([photoRecord], store, 'import')
    expect(summary.imported).toEqual(['teju'])
    expect(store.createdProfiles[0]).toMatchObject({ owner_id: 'user-1', slug: 'teju', status: 'draft', published_at: null })
    expect(store.linksByProfile.get('profile-1')).toEqual(photoRecord.draft.links)
  })

  it('resumes a same-owner, same-slug draft rather than creating another profile', async () => {
    const store = fakeStore({
      authUser: { id: 'user-1', email: 'teju2344@gmail.com' },
      existingProfiles: [{ id: 'profile-1', slug: 'teju', ownerId: 'user-1', status: 'draft' }],
    })
    const summary = await runLegacyImport([photoRecord], store, 'import')
    expect(summary.imported).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(0)
    expect(store.linksByProfile.get('profile-1')).toEqual(photoRecord.draft.links)
  })

  it('rejects a different slug already owned by the matched account', async () => {
    const store = fakeStore({
      authUser: { id: 'user-1', email: 'teju2344@gmail.com' },
      existingProfiles: [{ id: 'profile-1', slug: 'another-slug', ownerId: 'user-1', status: 'draft' }],
    })
    const summary = await runLegacyImport([readyRecord], store, 'import')
    expect(summary.conflicts).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(0)
  })

  it('rejects a desired slug owned by another account', async () => {
    const store = fakeStore({
      authUser: { id: 'user-1', email: 'teju2344@gmail.com' },
      existingProfiles: [{ id: 'profile-other', slug: 'teju', ownerId: 'user-2', status: 'draft' }],
    })
    const summary = await runLegacyImport([readyRecord], store, 'import')
    expect(summary.conflicts).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(0)
  })

  it('does not resume a published matching profile', async () => {
    const store = fakeStore({
      authUser: { id: 'user-1', email: 'teju2344@gmail.com' },
      existingProfiles: [{ id: 'profile-1', slug: 'teju', ownerId: 'user-1', status: 'published' }],
    })
    const summary = await runLegacyImport([readyRecord], store, 'import')
    expect(summary.conflicts).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(0)
  })

  it('persists the path returned by deterministic photo upload', async () => {
    const store = fakeStore({ authUser: { id: 'user-1', email: 'teju2344@gmail.com' } })
    const summary = await runLegacyImport([photoRecord], store, 'import')
    expect(summary.imported).toEqual(['teju'])
    expect(store.uploadAttempts).toEqual(['user-1/legacy/teju.jpg'])
    expect(store.profileUpdates).toContainEqual({ profileId: 'profile-1', values: { photo_path: 'stored/user-1/legacy/teju.jpg' } })
  })

  it('retries after profile creation without duplicating the profile or links', async () => {
    const store = fakeStore({ authUser: { id: 'user-1', email: 'teju2344@gmail.com' }, failReplaceLinks: 1 })
    const first = await runLegacyImport([photoRecord], store, 'import')
    const retry = await runLegacyImport([photoRecord], store, 'import')
    expect(first.failed).toEqual([{ slug: 'teju', reason: 'link replacement interrupted' }])
    expect(retry.imported).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(1)
    expect(store.linksByProfile.get('profile-1')).toEqual(photoRecord.draft.links)
  })

  it('retries after links were saved without duplicating links or files', async () => {
    const store = fakeStore({ authUser: { id: 'user-1', email: 'teju2344@gmail.com' }, failUploadPhoto: 1 })
    const first = await runLegacyImport([photoRecord], store, 'import')
    const retry = await runLegacyImport([photoRecord], store, 'import')
    expect(first.failed).toEqual([{ slug: 'teju', reason: 'photo upload interrupted' }])
    expect(retry.imported).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(1)
    expect(store.linksByProfile.get('profile-1')).toEqual(photoRecord.draft.links)
    expect(store.uploadedFiles.size).toBe(1)
  })

  it('retries after upload before photo-path persistence without duplicating the file', async () => {
    const store = fakeStore({ authUser: { id: 'user-1', email: 'teju2344@gmail.com' }, failUpdateProfile: 1 })
    const first = await runLegacyImport([photoRecord], store, 'import')
    const retry = await runLegacyImport([photoRecord], store, 'import')
    expect(first.failed).toEqual([{ slug: 'teju', reason: 'profile update interrupted' }])
    expect(retry.imported).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(1)
    expect(store.uploadAttempts).toEqual(['user-1/legacy/teju.jpg', 'user-1/legacy/teju.jpg'])
    expect(store.uploadedFiles.size).toBe(1)
    expect(store.profileUpdates.at(-1)).toEqual({ profileId: 'profile-1', values: { photo_path: 'stored/user-1/legacy/teju.jpg' } })
  })

  it('does not write during a dry run, including for a resumable draft', async () => {
    const store = fakeStore({
      authUser: { id: 'user-1', email: 'teju2344@gmail.com' },
      existingProfiles: [{ id: 'profile-1', slug: 'teju', ownerId: 'user-1', status: 'draft' }],
    })
    const summary = await runLegacyImport([photoRecord], store, 'dry-run')
    expect(summary.ready).toEqual(['teju'])
    expect(store.createdProfiles).toHaveLength(0)
    expect(store.linksByProfile.size).toBe(0)
    expect(store.uploadedFiles.size).toBe(0)
  })
})
