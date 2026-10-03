export function profileCoverImageUrl(path: string | null, access: 'private' | 'published'): string | null {
  if (!path) return null
  if (path.startsWith('/api/gift-media?')) return path

  const url = `/api/profile-cover?path=${encodeURIComponent(path)}`
  return access === 'published' ? `${url}&published=1` : url
}
