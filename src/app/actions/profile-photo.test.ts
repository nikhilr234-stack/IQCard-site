import { beforeEach, describe, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { createServerClient } from '@/lib/supabase/server'
import { deleteProfilePhoto, uploadProfilePhoto } from './profile-photo'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/account', () => ({ requireAuthenticatedAccount: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createServerClient: vi.fn() }))

const profile = { id: 'profile-1', slug: 'owner', photo_path: 'owner-1/old.jpg' }

function configuredClient({ updateError = null, uploadError = null, removalError = null, removalThrows = null, events }: {
  updateError?: Error | null
  uploadError?: Error | null
  removalError?: Error | null
  removalThrows?: Error | null
  events: string[]
}) {
  const remove = vi.fn(async () => {
    events.push('storage-remove')
    if (removalThrows) throw removalThrows
    return { error: removalError }
  })
  const update = vi.fn(() => ({ eq: vi.fn(async () => {
    events.push('database-update')
    return { error: updateError }
  }) }))
  const from = vi.fn((table: string) => table === 'profiles'
    ? { select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: profile, error: null }) })) })), update }
    : undefined)
  return { from, storage: { from: vi.fn(() => ({ upload: vi.fn().mockResolvedValue({ error: uploadError }), remove })) }, remove }
}

describe('profile photo actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(requireAuthenticatedAccount).mockResolvedValue({ id: 'owner-1', email: 'owner@example.com', role: 'client' })
  })

  it('cleans up a newly uploaded object when saving its database path fails', async () => {
    const events: string[] = []
    const client = configuredClient({ updateError: new Error('database unavailable'), events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)
    const formData = new FormData()
    formData.set('photo', new File([new Uint8Array(1)], 'portrait.png', { type: 'image/png' }))

    await expect(uploadProfilePhoto(formData)).rejects.toThrow('Unable to save photo.')

    expect(client.remove).toHaveBeenCalledTimes(1)
    expect(client.remove).toHaveBeenCalledWith([expect.stringMatching(/^owner-1\/.+\.png$/)])
  })

  it('does not remove Storage when the database cannot clear the profile photo path', async () => {
    const events: string[] = []
    const client = configuredClient({ updateError: new Error('database unavailable'), events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await expect(deleteProfilePhoto()).rejects.toThrow('Unable to remove photo.')

    expect(client.remove).not.toHaveBeenCalled()
    expect(events).toEqual(['database-update'])
  })

  it('clears the database reference before best-effort Storage removal', async () => {
    const events: string[] = []
    const client = configuredClient({ removalError: new Error('storage unavailable'), events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await deleteProfilePhoto()

    expect(events).toEqual(['database-update', 'storage-remove'])
    expect(console.error).toHaveBeenCalledWith('Profile photo deletion cleanup failed.', expect.any(Error))
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/owner')
  })

  it('keeps a committed upload successful when old-photo removal returns an error', async () => {
    const events: string[] = []
    const client = configuredClient({ removalError: new Error('storage unavailable'), events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)
    const formData = new FormData()
    formData.set('photo', new File([new Uint8Array(1)], 'portrait.png', { type: 'image/png' }))

    await expect(uploadProfilePhoto(formData)).resolves.toBeUndefined()

    expect(events).toEqual(['database-update', 'storage-remove'])
    expect(console.error).toHaveBeenCalledWith('Profile photo replacement cleanup failed.', expect.any(Error))
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/owner')
  })

  it('keeps a committed upload successful when old-photo removal throws', async () => {
    const events: string[] = []
    const client = configuredClient({ removalThrows: new Error('network offline'), events })
    vi.mocked(createServerClient).mockResolvedValue(client as never)
    const formData = new FormData()
    formData.set('photo', new File([new Uint8Array(1)], 'portrait.png', { type: 'image/png' }))

    await expect(uploadProfilePhoto(formData)).resolves.toBeUndefined()

    expect(events).toEqual(['database-update', 'storage-remove'])
    expect(console.error).toHaveBeenCalledWith('Profile photo replacement cleanup failed.', expect.any(Error))
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard')
    expect(revalidatePath).toHaveBeenCalledWith('/owner')
  })
})
