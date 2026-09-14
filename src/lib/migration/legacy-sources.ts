import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { normalizeLegacyContact, parseLegacyHtml, parseVCard, type LegacyParseIssue, type LegacyProfileDraft } from './legacy-profile.ts'

export type LegacySource = {
  sourceSlug: string
  htmlPath: string | null
  htmlText: string | null
  vcardPath: string | null
  vcardText: string | null
  photoPath: string | null
}

export type MigrationRecord = {
  sourceSlug: string
  source: LegacySource
  draft: LegacyProfileDraft
  state: 'ready' | 'missing-email' | 'invalid' | 'conflict'
  issues?: LegacyParseIssue[]
}

const PROFILE_DIRECTORIES = new Map([
  ['ashwin', 'Ashwin'],
  ['aadhya', 'aadhya'],
  ['hema', 'hema'],
  ['infant', 'infant'],
  ['mithul', 'mithul'],
  ['naveen', 'naveen'],
  ['nikki', 'nikki'],
  ['prerna', 'prerna'],
  ['rajesh', 'rajesh'],
  ['rakesh', 'rakesh'],
  ['ravichandra', 'ravichandra'],
  ['rohan', 'rohan'],
  ['sharath', 'sharath'],
  ['teju', 'teju'],
])

const ROOT_VCARDS = new Map([
  ['aadhya', 'aadhya.vcf'],
  ['hema', 'hema.vcf'],
  ['infant', 'infant.vcf'],
  ['naveen', 'naveen-samant.vcf'],
  ['nikhil', 'nikhil.vcf'],
  ['prerna', 'prerna.vcf'],
  ['rajesh', 'rajesh-shetty.vcf'],
  ['ravichandra', 'ravichandra.vcf'],
  ['teju', 'teju.vcf'],
])

const ROOT_PHOTOS = new Map([
  ['nikhil', 'nikhil.jpg'],
  ['aadhya', 'aadhya.jpg'],
  ['hema', 'hema.jpg'],
  ['infant', 'infant.jpg'],
  ['prerna', 'prerna.jpg'],
  ['teju', 'teju.jpg'],
])

function firstMatchingFile(directory: string, extension: string): string | null {
  if (!existsSync(directory)) return null
  const name = readdirSync(directory).find((entry) => entry.toLowerCase().endsWith(extension))
  return name ? join(directory, name) : null
}

function sourceForDirectory(rootDir: string, sourceSlug: string, directoryName: string): LegacySource {
  const directory = join(rootDir, directoryName)
  const htmlPath = existsSync(join(directory, 'index.html')) ? join(directory, 'index.html') : null
  const nestedVCard = firstMatchingFile(directory, '.vcf')
  const rootVCardName = ROOT_VCARDS.get(sourceSlug)
  const rootVCard = rootVCardName && existsSync(join(rootDir, rootVCardName)) ? join(rootDir, rootVCardName) : null
  const vcardPath = nestedVCard || rootVCard
  const rootPhotoName = ROOT_PHOTOS.get(sourceSlug)
  const rootPhoto = rootPhotoName && existsSync(join(rootDir, rootPhotoName)) ? join(rootDir, rootPhotoName) : null
  const photoPath = rootPhoto || firstMatchingFile(directory, '.jpg')

  return {
    sourceSlug,
    htmlPath,
    htmlText: htmlPath ? readFileSync(htmlPath, 'utf8') : null,
    vcardPath,
    vcardText: vcardPath ? readFileSync(vcardPath, 'utf8') : null,
    photoPath,
  }
}

export function discoverLegacySources(rootDir: string): LegacySource[] {
  const sources = [...PROFILE_DIRECTORIES.entries()].map(([sourceSlug, directoryName]) => sourceForDirectory(rootDir, sourceSlug, directoryName))
  const nikhil = ROOT_VCARDS.get('nikhil')
  if (nikhil && existsSync(join(rootDir, nikhil))) {
    sources.push({
      sourceSlug: 'nikhil',
      htmlPath: existsSync(join(rootDir, 'iq/index.html')) ? join(rootDir, 'iq/index.html') : null,
      htmlText: existsSync(join(rootDir, 'iq/index.html')) ? readFileSync(join(rootDir, 'iq/index.html'), 'utf8') : null,
      vcardPath: join(rootDir, nikhil),
      vcardText: readFileSync(join(rootDir, nikhil), 'utf8'),
      photoPath: ROOT_PHOTOS.has('nikhil') ? join(rootDir, ROOT_PHOTOS.get('nikhil')!) : null,
    })
  }
  return sources
}

export function buildMigrationRecords(sources: LegacySource[]): MigrationRecord[] {
  return sources.map((source) => {
    const vcardContact = source.vcardText ? parseVCard(source.vcardText) : null
    const htmlContact = source.htmlText ? parseLegacyHtml(source.htmlText) : null
    const contact = vcardContact || htmlContact || { fullName: '', email: null, phone: null, headline: null, bio: null, urls: [] }
    if (vcardContact && htmlContact && !vcardContact.urls.length) contact.urls = htmlContact.urls
    const normalized = normalizeLegacyContact(contact, source.sourceSlug)
    if (Array.isArray(normalized)) {
      return {
        sourceSlug: source.sourceSlug,
        source,
        draft: {
          sourceSlug: source.sourceSlug,
          fullName: contact.fullName.trim(),
          email: contact.email?.trim().toLowerCase() || null,
          phone: contact.phone?.trim() || '',
          headline: contact.headline?.trim() || '',
          bio: contact.bio?.trim() || '',
          slug: source.sourceSlug,
          links: [],
          photoFileName: source.photoPath ? relative(process.cwd(), source.photoPath) : null,
        },
        state: 'invalid' as const,
        issues: normalized,
      }
    }
    const draft = { ...normalized, photoFileName: source.photoPath ? relative(process.cwd(), source.photoPath) : null }
    return { sourceSlug: source.sourceSlug, source, draft, state: draft.email ? 'ready' : 'missing-email' as const }
  })
}
