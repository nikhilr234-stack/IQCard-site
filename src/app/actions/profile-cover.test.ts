import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { createServerClient } from '@/lib/supabase/server'
import { deleteProfileCover, uploadProfileCover } from './profile-cover'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

const currentPresentation = {
  draft: {
    template: 'minimal',
    cover: {
      coverPath: 'owner-1/old-cover.jpg',
      overlay: 0.38,
      focalY: 50,
      alignment: 'lower-left',
      photoPathOverride: null,
    },
  },
  published: {
    template: 'minimal',
    cover: {
      coverPath: null,
      overlay: 0.38,
      focalY: 50,
      alignment: 'lower-left',
      photoPathOverride: null,
    },
  },
}

function configuredClient({ rpcError = null, events, publishedCoverPath = null, refreshedPublishedCoverPath = publishedCoverPath }: {
  rpcError?: Error | null
  events: string[]
  publishedCoverPath?: string | null
  refreshedPublishedCoverPath?: string | null
}) {
  const upload = vi.fn(async () => {
    events.push('storage-upload')
    return { error: null }
  })
  const remove = vi.fn(async () => {
    events.push('storage-remove')
    return { error: null }
  })
  const rpc = vi.fn(async (name: string) => {
    events.push(`rpc:${name}`)
    return { error: rpcError }
  })
  let readCount = 0
  const maybeSingle = vi.fn(async () => {
    const coverPath = readCount++ === 0 ? publishedCoverPath : refreshedPublishedCoverPath
    return {
      data: {
        draft: currentPresentation.draft,
        published: {
          ...currentPresentation.published,
          cover: { ...currentPresentation.published.cover, coverPath },
        },
      },
      error: null,
    }
  })
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle })),
    })),
  }))
  return { from, rpc, storage: { from: vi.fn(() => ({ upload, remove })) }, upload, remove }
}

describe('profile cover actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(requireAuthenticatedAccount).mockResolvedValue({
      id: 'owner-1',
      email: 'owner@example.com',
      role: 'client',
    })
  })

  it('rejects an unsupported cover file before it can reach Storage', async () => {
    const events: string[] = []
    const client = configuredClient({ events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)
    const formData = new FormData()
    formData.set('cover', new File([new Uint8Array(1)], 'cover.gif', { type: 'image/gif' }))

    await expect(uploadProfileCover(formData)).rejects.toThrow('Use a JPEG, PNG, or WebP image.')

    expect(client.upload).not.toHaveBeenCalled()
    expect(client.rpc).not.toHaveBeenCalled()
  })

  it('persists a validated owner-scoped cover path without deleting the replaced draft object', async () => {
    const events: string[] = []
    const client = configuredClient({ events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)
    const formData = new FormData()
    formData.set('cover', new File([new Uint8Array(1)], 'cover.png', { type: 'image/png' }))

    const result = await uploadProfileCover(formData)

    expect(result).toEqual({ coverPath: expect.stringMatching(/^owner-1\/.+\.png$/) })
    expect(client.upload).toHaveBeenCalledWith(expect.stringMatching(/^owner-1\/.+\.png$/), expect.any(File), {
      contentType: 'image/png',
      upsert: false,
    })
    expect(events).toEqual(['storage-upload', 'rpc:save_own_profile_presentation'])
    expect(client.rpc).toHaveBeenCalledWith('save_own_profile_presentation', {
      p_draft: expect.objectContaining({
        template: 'minimal',
        cover: expect.objectContaining({ coverPath: expect.stringMatching(/^owner-1\/.+\.png$/), backgroundEnabled: true }),
      }),
    })
    expect(client.remove).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/digital-profile')
  })

  it('removes a newly uploaded object when saving its authenticated draft path fails', async () => {
    const events: string[] = []
    const client = configuredClient({ events, rpcError: new Error('database unavailable') })
    vi.mocked(createServerClient).mockResolvedValue(client as never)
    const formData = new FormData()
    formData.set('cover', new File([new Uint8Array(1)], 'cover.webp', { type: 'image/webp' }))

    await expect(uploadProfileCover(formData)).rejects.toThrow('Unable to save cover.')

    expect(events).toEqual(['storage-upload', 'rpc:save_own_profile_presentation', 'storage-remove'])
    expect(client.remove).toHaveBeenCalledWith([expect.stringMatching(/^owner-1\/.+\.webp$/)])
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('clears the saved draft path without deleting its Storage object', async () => {
    const events: string[] = []
    const client = configuredClient({ events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await expect(deleteProfileCover()).resolves.toEqual({ coverPath: null })

    expect(events).toEqual(['rpc:save_own_profile_presentation'])
    expect(client.rpc).toHaveBeenCalledWith('save_own_profile_presentation', {
      p_draft: expect.objectContaining({ cover: expect.objectContaining({ coverPath: null }) }),
    })
    expect(client.remove).not.toHaveBeenCalled()
  })

  it('retains an object when the published Cover snapshot still references it', async () => {
    const events: string[] = []
    const client = configuredClient({ events, publishedCoverPath: 'owner-1/old-cover.jpg' })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await deleteProfileCover()

    expect(events).toEqual(['rpc:save_own_profile_presentation'])
    expect(client.remove).not.toHaveBeenCalled()
  })

  it('does not delete the old draft object when a concurrent publish promotes it after replacement saves', async () => {
    const events: string[] = []
    const client = configuredClient({
      events,
      publishedCoverPath: null,
      refreshedPublishedCoverPath: 'owner-1/old-cover.jpg',
    })
    vi.mocked(createServerClient).mockResolvedValue(client as never)
    const formData = new FormData()
    formData.set('cover', new File([new Uint8Array(1)], 'cover.png', { type: 'image/png' }))

    await uploadProfileCover(formData)

    expect(client.remove).not.toHaveBeenCalled()
  })

  it('does not delete a removed draft object when a concurrent publish promotes it after removal saves', async () => {
    const events: string[] = []
    const client = configuredClient({
      events,
      publishedCoverPath: null,
      refreshedPublishedCoverPath: 'owner-1/old-cover.jpg',
    })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await deleteProfileCover()

    expect(client.remove).not.toHaveBeenCalled()
  })
})
