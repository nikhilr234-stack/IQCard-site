import { isValidProfileLinkUrl } from './validation'
import type { WhatsNextItem } from './types'

export const WHATS_NEXT_MAX_ITEMS = 3
export const WHATS_NEXT_TITLE_MAX_LENGTH = 80
export const WHATS_NEXT_DESCRIPTION_MAX_LENGTH = 240
export const WHATS_NEXT_DATE_MAX_LENGTH = 80

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function trimmedText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

export function normalizeWhatsNext(input: unknown): WhatsNextItem[] {
  if (!Array.isArray(input)) return []
  return input.flatMap((value) => {
    if (!isRecord(value)) return []
    const title = trimmedText(value.title, WHATS_NEXT_TITLE_MAX_LENGTH)
    const description = trimmedText(value.description, WHATS_NEXT_DESCRIPTION_MAX_LENGTH)
    const date = trimmedText(value.date, WHATS_NEXT_DATE_MAX_LENGTH)
    const candidateUrl = trimmedText(value.url, 2048)
    const url = candidateUrl && isValidProfileLinkUrl(candidateUrl) ? candidateUrl : ''
    return title && description ? [{ title, description, date, url }] : []
  }).slice(0, WHATS_NEXT_MAX_ITEMS)
}

export function validateWhatsNext(items: readonly WhatsNextItem[]): string | null {
  if (items.length > WHATS_NEXT_MAX_ITEMS) return 'You can add up to 3 What’s next items.'

  for (const [index, item] of items.entries()) {
    const hasContent = Boolean(item.title.trim() || item.description.trim() || item.date.trim() || item.url.trim())
    if (!hasContent) continue
    if (!item.title.trim()) return `Add a title to What’s next item ${index + 1} or remove it.`
    if (item.title.trim().length > WHATS_NEXT_TITLE_MAX_LENGTH) return 'Titles must be 80 characters or fewer.'
    if (!item.description.trim()) return `Add a short description to What’s next item ${index + 1} or remove it.`
    if (item.description.trim().length > WHATS_NEXT_DESCRIPTION_MAX_LENGTH) return 'Descriptions must be 240 characters or fewer.'
    if (item.date.trim().length > WHATS_NEXT_DATE_MAX_LENGTH) return 'Dates must be 80 characters or fewer.'
    if (item.url.trim().length > 2048) return 'Links must be 2048 characters or fewer.'
    if (item.url.trim() && !isValidProfileLinkUrl(item.url)) return 'Use an HTTP(S) link or a contact link.'
  }

  return null
}

export function validateWhatsNextInput(input: unknown): string | null {
  if (input === undefined || input === null) return null
  if (!Array.isArray(input)) return 'What’s next items could not be read.'
  if (input.length > WHATS_NEXT_MAX_ITEMS) return 'You can add up to 3 What’s next items.'

  const items: WhatsNextItem[] = []
  for (const value of input) {
    if (!isRecord(value)) return 'What’s next items could not be read.'
    if (typeof value.title !== 'string' || typeof value.description !== 'string') return 'What’s next items could not be read.'
    if (value.date !== undefined && typeof value.date !== 'string') return 'What’s next items could not be read.'
    if (value.url !== undefined && typeof value.url !== 'string') return 'What’s next items could not be read.'
    items.push({
      title: value.title,
      description: value.description,
      date: typeof value.date === 'string' ? value.date : '',
      url: typeof value.url === 'string' ? value.url : '',
    })
  }

  return validateWhatsNext(items)
}
