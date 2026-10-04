import { readFileSync } from 'node:fs'
// @ts-expect-error jsdom is a test runtime dependency.
import { JSDOM } from 'jsdom'
import { describe, expect, it } from 'vitest'
// @ts-expect-error Browser modules served directly.
import * as persistence from '../../../public/customize/logo-persistence.mjs'
// @ts-expect-error Browser modules served directly.
import * as registration from '../../../public/customize/registration-validation.mjs'
// @ts-expect-error Browser modules served directly.
import * as inspection from '../../../public/customize/mobile-inspection.mjs'
// @ts-expect-error Browser modules served directly.
import * as savedDesign from '../../../public/customize/saved-design.mjs'
const html = readFileSync('public/customize/index.html', 'utf8')
const config = { core: 'black', material: 'Ivory Marble', craft: 'engrave', customColor: null, backLayout: 'identity', identity: { name: 'Rohan Biligi', tone: 'light', composition: 'signature', fineTune: { align: 'right', nameScale: 1.2, x: 8, y: -4 } }, logo: { mode: 'iq', dataUrl: null, filename: null, mimeType: null, align: 'right', scale: 0.8, x: 12, y: 5 } }
async function scene(mode: string, success = true, saved = config) {
  const dom = new JSDOM(html, { url: `https://iqcard.in/customize?${mode}=1&design=IQD-REAL`, runScripts: 'outside-only', pretendToBeVisual: true })
  const window = dom.window
  Object.assign(window, persistence, registration, inspection, savedDesign)
  window.matchMedia = () => ({ matches: false, addEventListener() {} }) as unknown as MediaQueryList
  window.HTMLElement.prototype.scrollIntoView = () => {}
  window.HTMLElement.prototype.scrollTo = () => {}
  window.HTMLCanvasElement.prototype.getContext = (() => null) as typeof window.HTMLCanvasElement.prototype.getContext
  window.console.warn = () => {}
  window.fetch = async () => ({ ok: success, json: async () => ({ id: 'IQD-REAL', configuration: saved }) }) as Response
  window.loadOwnedAtelierDesign = (id: string) => savedDesign.loadOwnedAtelierDesign(id, window.fetch)
  const script = window.document.querySelector('script[type="module"]')!.textContent!.replace(/^\s*import .*;$/gm, '')
  const current = await window.eval(`(async () => { ${script}; return JSON.parse(JSON.stringify(configuration)); })()`)
  return { dom, current }
}
describe('shared Atelier scene restore', () => {
  it.each(['preview', 'resume'])('hydrates %s without changing saved lettering, surface or logo placement', async mode => {
    const { dom, current } = await scene(mode)
    try {
      expect(current).toMatchObject(config)
      expect(dom.window.document.querySelector('#frontName')!.textContent).toBe('Rohan Biligi')
      expect(dom.window.document.querySelector<HTMLElement>('.card-front .card-logo')!.style.right).toBe('34px')
      if (mode === 'preview') expect(dom.window.localStorage.getItem('iqcard.savedDesigns.v1')).toBeNull()
    } finally { dom.window.close() }
  })
  it('shows a recoverable error when the server cannot return the owned design', async () => {
    const { dom } = await scene('preview', false)
    try {
      expect(dom.window.document.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded')
      expect(dom.window.document.querySelector('#iqCard')).toBeNull()
    } finally { dom.window.close() }
  })
  it('preserves an explicitly unengraved card when resuming', async () => {
    const { dom, current } = await scene('resume', true, { ...config, identity: { ...config.identity, name: '' } })
    try {
      expect(current.identity.name).toBe('')
      expect(dom.window.document.querySelector('#frontName')!.textContent).toBe('')
    } finally { dom.window.close() }
  })

})
