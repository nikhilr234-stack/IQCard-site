import { normalizeProfileLinkUrl, validateLinkInput } from './validation'

export type LinkInput = { label: string; url: string }

export function normalizeLinks(links: LinkInput[]): LinkInput[] {
  return links
    .map((link) => ({ label: link.label.trim(), url: normalizeProfileLinkUrl(link.url) }))
    .filter((link) => link.label || link.url)
    .slice(0, 12)
}

export function validateLinks(links: LinkInput[]): string | null {
  if (links.length > 12) return 'You can add up to 12 links.'
  for (const link of normalizeLinks(links)) {
    const error = validateLinkInput(link.label, link.url)
    if (error) return error
  }
  return null
}
