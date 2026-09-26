import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanupGiftMedia, uploadGiftMedia } from './media'

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }))

function createFiles() {
  return {
    portrait: new File([Uint8Array.from([1, 2, 3])], 'private-name.png', { type: 'image/png' }),
    cover: new File([Uint8Array.from([4, 5, 6])], 'cover.webp', { type: 'image/webp' }),
  }
}

describe('gift media storage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('validates every image before uploading any file', async () => {
    const upload = vi.fn()
    vi.mocked(createAdminClient).mockReturnValue({ storage: { from: () => ({ upload }) } } as never)
    const files = createFiles()
    files.cover = new File(['not an image'], 'cover.txt', { type: 'text/plain' }) as never

    await expect(uploadGiftMedia('123e4567-e89b-12d3-a456-426614174000', files)).rejects.toThrow('Use a JPEG, PNG, or WebP image.')
    expect(upload).not.toHaveBeenCalled()
  })

  it('uploads accepted images to generated stable paths scoped to the gift profile', async () => {
    const upload = vi.fn()
      .mockImplementation(async (path: string) => ({ data: { path }, error: null }))
    const from = vi.fn(() => ({ upload }))
    vi.mocked(createAdminClient).mockReturnValue({ storage: { from } } as never)
    const files = createFiles()

    const result = await uploadGiftMedia('123e4567-e89b-12d3-a456-426614174000', files)

    expect(from).toHaveBeenCalledWith('gift-media')
    expect(upload).toHaveBeenCalledTimes(2)
    expect(upload.mock.calls[0][0]).toMatch(/^gift\/123e4567-e89b-12d3-a456-426614174000\/portrait-[0-9a-f-]+\.png$/)
    expect(upload.mock.calls[1][0]).toMatch(/^gift\/123e4567-e89b-12d3-a456-426614174000\/cover-[0-9a-f-]+\.webp$/)
    expect(upload.mock.calls[0][0]).not.toContain('private-name')
    expect(result).toMatchObject({
      photoPath: expect.stringMatching(/^gift\/123e4567-e89b-12d3-a456-426614174000\/portrait-/),
      coverPath: expect.stringMatching(/^gift\/123e4567-e89b-12d3-a456-426614174000\/cover-/),
      uploadedPaths: [
        expect.stringMatching(/^gift\/123e4567-e89b-12d3-a456-426614174000\/portrait-/),
        expect.stringMatching(/^gift\/123e4567-e89b-12d3-a456-426614174000\/cover-/),
      ],
    })
  })

  it('removes an earlier upload if a later upload fails', async () => {
    const remove = vi.fn().mockResolvedValue({ error: null })
    const upload = vi.fn()
      .mockImplementationOnce(async (path: string) => ({ data: { path }, error: null }))
      .mockResolvedValueOnce({ data: null, error: new Error('provider detail') })
    const from = vi.fn(() => ({ upload, remove }))
    vi.mocked(createAdminClient).mockReturnValue({ storage: { from } } as never)

    await expect(uploadGiftMedia('123e4567-e89b-12d3-a456-426614174000', createFiles())).rejects.toThrow('Unable to upload gift media')
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^gift\/123e4567-e89b-12d3-a456-426614174000\/portrait-/)])
  })

  it('keeps cleanup best-effort and never returns private storage errors', async () => {
    const remove = vi.fn().mockResolvedValue({ error: new Error('private provider detail') })
    vi.mocked(createAdminClient).mockReturnValue({ storage: { from: () => ({ remove }) } } as never)

    await expect(cleanupGiftMedia(['gift/profile/private.png'])).resolves.toBeUndefined()
    expect(remove).toHaveBeenCalledWith(['gift/profile/private.png'])
  })
})
