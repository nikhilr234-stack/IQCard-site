import { suggestSlug, validateLinkInput } from '../profile/validation.ts'

export type LegacyContact = {
  fullName: string
  email: string | null
  phone: string | null
  headline: string | null
  bio: string | null
  urls: Array<{ label: string; url: string }>
}

export type LegacyParseIssue = {
  field: string
  message: string
}

export type LegacyProfileDraft = {
  sourceSlug: string
  fullName: string
  email: string | null
  phone: string
  headline: string
  bio: string
  slug: string
  links: Array<{ label: string; url: string }>
  photoFileName: string | null
}

function unfoldVCard(text: string): string[] {
  const lines: string[] = []
  for (const line of text.replaceAll('\r\n', '\n').replaceAll('\r', '\n').split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length) {
      lines[lines.length - 1] += line.slice(1)
    } else {
      lines.push(line)
    }
  }
  return lines
}

function unescapeVCard(value: string): string {
  return value
    .replaceAll('\\n', '\n')
    .replaceAll('\\N', '\n')
    .replaceAll('\\,', ',')
    .replaceAll('\\;', ';')
    .replaceAll('\\\\', '\\')
    .trim()
}

function normalizeLegacyUrl(value: string): string {
  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:[/?#].*)?$/i.test(value)) return `https://${value}`
  return value
}

function fieldParts(field: string): { name: string; type: string | null } {
  const [rawName, ...params] = field.split(';')
  const typeParam = params.find((param) => param.toUpperCase().startsWith('TYPE='))
  return { name: rawName.toUpperCase(), type: typeParam?.slice(5) || null }
}

export function parseVCard(text: string): LegacyContact {
  let fullName = ''
  let email: string | null = null
  let phone: string | null = null
  let headline: string | null = null
  let bio: string | null = null
  const urls: Array<{ label: string; url: string }> = []

  for (const line of unfoldVCard(text)) {
    const separator = line.indexOf(':')
    if (separator <= 0) continue
    const { name, type } = fieldParts(line.slice(0, separator))
    const value = unescapeVCard(line.slice(separator + 1))
    if (!value) continue

    if (name === 'FN' && !fullName) fullName = value
    if (name === 'EMAIL' && !email) email = value.toLowerCase()
    if (name === 'TEL' && !phone) phone = value
    if (name === 'TITLE' && !headline) headline = value
    if (name === 'NOTE' && !bio) bio = value
    if (name === 'URL') urls.push({ label: type || 'URL', url: value })
  }

  return { fullName, email, phone, headline, bio, urls }
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll(/<[^>]+>/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim()
}

export function parseLegacyHtml(text: string): LegacyContact {
  const heading = text.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
  const headingEnd = heading ? text.indexOf('</h1>') + 5 : 0
  const firstParagraph = text.slice(headingEnd).match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]
  const urls: Array<{ label: string; url: string }> = []
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const match of text.matchAll(anchorPattern)) {
    const url = decodeHtml(match[1])
    if (!/^(?:https:|mailto:|tel:)/i.test(url)) continue
    urls.push({ label: decodeHtml(match[2]) || 'URL', url })
  }

  return {
    fullName: decodeHtml(heading || ''),
    email: null,
    phone: null,
    headline: decodeHtml(firstParagraph || '') || null,
    bio: null,
    urls,
  }
}

export function normalizeLegacyContact(
  contact: LegacyContact,
  sourceSlug: string,
): LegacyProfileDraft | LegacyParseIssue[] {
  const issues: LegacyParseIssue[] = []
  const slug = suggestSlug(sourceSlug)
  if (!contact.fullName.trim()) issues.push({ field: 'full_name', message: 'VCF is missing FN.' })
  if (!slug) issues.push({ field: 'slug', message: 'Source folder does not produce a valid slug.' })

  const links = contact.urls.map((link) => ({ label: link.label.trim(), url: normalizeLegacyUrl(link.url.trim()) }))
  for (const link of links) {
    const error = validateLinkInput(link.label, link.url)
    if (error) issues.push({ field: 'links', message: error })
  }
  if (issues.length) return issues

  return {
    sourceSlug,
    fullName: contact.fullName.trim(),
    email: contact.email?.trim().toLowerCase() || null,
    phone: contact.phone?.trim() || '',
    headline: contact.headline?.trim() || '',
    bio: contact.bio?.trim() || '',
    slug,
    links,
    photoFileName: null,
  }
}
