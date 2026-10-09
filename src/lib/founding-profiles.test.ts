// @vitest-environment jsdom
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import nextConfig from '../../next.config'

const founders = [
  ['infant', 'Infant Akash'],
  ['aadhya', 'Aadhya Chintala'],
  ['prerna', 'Prerna Revankar'],
  ['hema', 'Hema Goyal'],
  ['sharath', 'Sharath Rao H N'],
  ['mithul', 'Mithul Ravichandran'],
  ['naveen', 'Naveen Samant'],
  ['rajesh', 'Rajesh Shetty'],
  ['rakesh', 'Rakesh B S'],
  ['ravichandra', 'Ravichandra'],
  ['rohan', 'Rohan Biligi'],
  ['teju', 'Tejashree Pradhap'],
  ['Ashwin', 'Ashwin Reddy'],
] as const

describe('original founding profile recovery', () => {
  it.each(founders)('serves %s at its original address before the database profile route', async (slug, name) => {
    const rewrites = await nextConfig.rewrites!()
    const routes = Array.isArray(rewrites) ? rewrites : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? [])]
    const route = routes.find((candidate) => candidate.source === `/${slug}`)
    expect(route, `No restoration route for ${slug}`).toBeDefined()
    const path = resolve('public', route!.destination.slice(1))
    expect(existsSync(path), `Missing restored page ${path}`).toBe(true)
    const document = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'text/html')
    expect(document.querySelector('h1')?.textContent?.trim()).toBe(name)
  })

  it.each(founders)('loads all images and contact downloads from %s without broken relative URLs', (slug) => {
    const path = resolve('public/founding-profiles', slug, 'index.html')
    expect(existsSync(path), `Missing restored page ${path}`).toBe(true)
    const html = readFileSync(path, 'utf8')
    const document = new DOMParser().parseFromString(html, 'text/html')
    const references = [
      ...Array.from(document.querySelectorAll('img')).map((image) => image.getAttribute('src')!),
      ...Array.from(document.querySelectorAll('a')).map((link) => link.getAttribute('href')!).filter((href) => /\.vcf(?:$|\?)/i.test(href)),
      ...Array.from(html.matchAll(/url\(["']?([^"')]+)["']?\)/g), (match) => match[1]),
    ]
    for (const reference of references) {
      const url = new URL(reference, `https://iqcard.test/${slug}`)
      if (url.origin !== 'https://iqcard.test') continue
      expect(existsSync(resolve('public', decodeURIComponent(url.pathname.slice(1)))), `${slug}: missing ${reference}`).toBe(true)
    }
    expect(document.querySelector('a[href$=".vcf"]'), `${slug}: Save Contact missing`).not.toBeNull()
  })

  it.each(['hema', 'naveen', 'rajesh', 'ravichandra'])('connects %s update requests to a real draft instead of an unfinished external form', (slug) => {
    const html = readFileSync(resolve('public/founding-profiles', slug, 'index.html'), 'utf8')
    const document = new DOMParser().parseFromString(html, 'text/html')
    const form = document.querySelector<HTMLFormElement>('form.update-form')!
    expect(form.getAttribute('action')).toBe('/api/founding-profile-update')
    expect(form.querySelector<HTMLInputElement>('[name="profile"]')?.value).toBe(slug)
    expect(form.querySelector('button[type="submit"]')?.textContent).toBe('Open Email Draft')
  })

  it('does not capture unrelated profiles, account routes, or the customizer', async () => {
    const rewrites = await nextConfig.rewrites!()
    const routes = Array.isArray(rewrites) ? rewrites : [...(rewrites.beforeFiles ?? []), ...(rewrites.afterFiles ?? [])]
    const founderRoutes = routes.filter((route) => route.destination.startsWith('/founding-profiles/'))
    expect(founderRoutes.length).toBeGreaterThan(0)
    expect(founderRoutes.every((route) => /^\/(?:infant|aadhya|prerna|hema|sharath|mithul|naveen|rajesh|rakesh|ravichandra|rohan|teju|Ashwin)(?:\/|$)/.test(route.source))).toBe(true)
    expect(routes).toContainEqual({ source: '/customize', destination: '/customize/index.html' })
  })
})
