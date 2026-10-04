import { readFileSync } from 'node:fs'
// @ts-expect-error jsdom is a test runtime dependency.
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
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
async function scene(mode: string, success = true, saved = config, history: unknown[] = [], marker: string | null = null) {
  const dom = new JSDOM(html, { url: `https://iqcard.in/customize?${mode}=1&design=IQD-REAL`, runScripts: 'outside-only', pretendToBeVisual: true })
  const window = dom.window
  window.localStorage.setItem('iqcard.savedDesigns.v1', JSON.stringify(history))
  if (marker !== null) window.localStorage.setItem('iqcard.checkoutHandoff.v1', marker)
  Object.assign(window, persistence, registration, inspection, savedDesign)
  window.matchMedia = () => ({ matches: false, addEventListener() {} }) as unknown as MediaQueryList
  window.HTMLElement.prototype.scrollIntoView = () => {}
  window.HTMLElement.prototype.scrollTo = () => {}
  window.HTMLCanvasElement.prototype.getContext = (() => null) as typeof window.HTMLCanvasElement.prototype.getContext
  window.console.warn = () => {}
  window.fetch = async () => ({ ok: success, json: async () => ({ ok: success, sent: success, id: 'IQD-REAL', configuration: saved }) }) as Response
  window.loadOwnedAtelierDesign = (id: string) => savedDesign.loadOwnedAtelierDesign(id, window.fetch)
  const script = window.document.querySelector('script[type="module"]')!.textContent!.replace(/^\s*import .*;$/gm, '')
  const api = await window.eval(`(async () => { ${script}; return { current: JSON.parse(JSON.stringify(configuration)), confirmBuild, restoreSavedDesign }; })()`)
  return { dom, current: api.current, confirmBuild: api.confirmBuild, restoreSavedDesign: api.restoreSavedDesign }
}
describe('shared Atelier scene restore', () => {
  it.each(['preview', 'resume'])('hydrates %s without changing saved lettering, surface or logo placement', async mode => {
    const { dom, current } = await scene(mode)
    try {
      expect(current).toMatchObject(config)
      expect(dom.window.document.querySelector('#frontName')!.textContent).toBe('Rohan Biligi')
      expect(dom.window.document.querySelector<HTMLElement>('.card-front .card-logo')!.style.right).toBe('34px')
      if (mode === 'preview') expect(dom.window.localStorage.getItem('iqcard.savedDesigns.v1')).toBe('[]')
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

  it('returns to the submitted card rather than a different newer manual save', async () => {
    const history = [
      { id: 'IQD-OTHER', saveMode: 'manual', configuration: { ...config, material: 'Walnut', identity: { ...config.identity, name: 'Other Design' } } },
      { id: 'IQD-SENT', saveMode: 'auto', configuration: config },
    ]
    const { dom, current } = await scene('restore', true, config, history, '{"designId":"IQD-SENT"}')
    try {
      expect(current).toMatchObject(config)
      expect(dom.window.document.querySelector('#frontName')!.textContent).toBe('Rohan Biligi')
      expect(dom.window.document.querySelector('#iq-atelier')!.classList.contains('order-review-mode')).toBe(true)
    } finally { dom.window.close() }
  })

  it.each([null, '{}', '{"designId":null}', 'not-json'])('does not guess the submitted card from an absent or corrupt reference (%j)', async marker => {
    const { dom } = await scene('restore', true, config, [{ id: 'IQD-OTHER', saveMode: 'manual', configuration: config }], marker)
    try {
      expect(dom.window.document.querySelector('[role="alert"]')?.textContent).toContain('browser')
      expect(dom.window.document.querySelector('#iqCard')).toBeNull()
    } finally { dom.window.close() }
  })

  it.each([undefined, null])('does not turn a missing configuration into a default saved card (%j)', async configuration => {
    const { dom } = await scene('restore', true, config, [{ id: 'IQD-SENT', configuration }], '{"designId":"IQD-SENT"}')
    try {
      expect(dom.window.document.querySelector('[role="alert"]')?.textContent).toContain('browser')
      expect(dom.window.document.querySelector('#iqCard')).toBeNull()
    } finally { dom.window.close() }
  })

  it.each([{ history: [] }, { history: [{ id: 'IQD-OTHER', configuration: config }] }])('does not substitute a default or another card when the submitted card is unavailable ($history)', async ({ history }) => {
    const { dom } = await scene('restore', true, config, history, '{"designId":"IQD-MISSING"}')
    try {
      expect(dom.window.document.querySelector('[role="alert"]')?.textContent).toContain('browser')
      expect(dom.window.document.querySelector('#iqCard')).toBeNull()
      expect(JSON.parse(dom.window.localStorage.getItem('iqcard.savedDesigns.v1')!)).toEqual(history)
    } finally { dom.window.close() }
  })

  it('checkpoints the exact submitted configuration before leaving for email', async () => {
    const { dom, confirmBuild, restoreSavedDesign } = await scene('normal')
    try {
      restoreSavedDesign({ id: 'IQD-SUBMITTED', configuration: { ...config, step: 'final' } })
      dom.window.document.querySelector<HTMLInputElement>('#handoffEmail')!.value = 'fixture@example.test'
      let requested = false
      dom.window.fetch = async () => {
        const records = JSON.parse(dom.window.localStorage.getItem('iqcard.savedDesigns.v1')!)
        expect(records[0]).toMatchObject({ id: 'IQD-SUBMITTED', saveMode: 'manual', configuration: config })
        expect(JSON.parse(dom.window.localStorage.getItem('iqcard.checkoutHandoff.v1')!)).toEqual({ designId: 'IQD-SUBMITTED' })
        requested = true
        return { ok: true, json: async () => ({ ok: true, sent: true }) } as Response
      }
      expect(await confirmBuild()).toMatchObject({ designId: 'IQD-SUBMITTED', configuration: config })
      expect(requested).toBe(true)
    } finally { dom.window.close() }
  })

  it.each(['iqcard.savedDesigns.v1', 'iqcard.checkoutHandoff.v1'])('does not send an email request when recovery storage fails (%s)', async key => {
    const { dom, confirmBuild, restoreSavedDesign } = await scene('normal')
    let requested = false
    const original = dom.window.Storage.prototype.setItem
    const storage = vi.spyOn(dom.window.Storage.prototype, 'setItem').mockImplementation(function (this: Storage, storedKey: string, value: string) {
      if (storedKey === key) throw new Error('QuotaExceededError')
      original.call(this, storedKey, value)
    })
    try {
      restoreSavedDesign({ id: 'IQD-SUBMITTED', configuration: { ...config, step: 'final' } })
      dom.window.document.querySelector<HTMLInputElement>('#handoffEmail')!.value = 'fixture@example.test'
      dom.window.fetch = async () => { requested = true; return { ok: true, json: async () => ({ ok: true }) } as Response }
      expect(await confirmBuild()).toBeNull()
      expect(requested).toBe(false)
      expect(dom.window.document.querySelector('#handoffMessage')!.textContent).not.toBe('')
    } finally { storage.mockRestore(); dom.window.close() }
  })

})
