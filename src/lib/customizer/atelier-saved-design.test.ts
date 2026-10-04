import { describe, expect, it } from 'vitest'
// @ts-expect-error Browser module served directly.
import { loadOwnedAtelierDesign, saveOwnedAtelierDesign } from '../../../public/customize/saved-design.mjs'

describe('Atelier saved design loading', () => {
  it('restores the exact design in final mode with its saved tone and IQ logo alignment', async () => {
    const configuration = { material: 'Ivory Marble', core: 'black', identity: { name: 'Rohan Biligi', tone: 'light' }, logo: { mode: 'iq', align: 'right' } }
    const result = await loadOwnedAtelierDesign('IQD-REAL', async () => ({ ok: true, json: async () => ({ id: 'IQD-REAL', configuration }) }))
    expect(result.configuration).toMatchObject({ step: 'final', material: 'Ivory Marble', identity: { name: 'Rohan Biligi', tone: 'light' }, logo: { align: 'right' } })
  })
  it('rejects missing or mismatched cards rather than showing a default Walnut card', async () => {
    await expect(loadOwnedAtelierDesign('IQD-REAL', async () => ({ ok: false }))).rejects.toThrow()
    await expect(loadOwnedAtelierDesign('IQD-REAL', async () => ({ ok: true, json: async () => ({ id: 'IQD-WRONG', configuration: { material: 'Walnut' } }) }))).rejects.toThrow()
  })
  it('only reports a dashboard save when the server confirms it', async () => {
    const payload = { schemaVersion: '1.0', configuration: { material: 'Walnut' } }
    await expect(saveOwnedAtelierDesign('IQD-REAL', payload, async () => ({ ok: false }))).rejects.toThrow()
    await expect(saveOwnedAtelierDesign('IQD-REAL', payload, async () => ({ ok: true, json: async () => ({ id: 'IQD-REAL' }) }))).resolves.toMatchObject({ id: 'IQD-REAL' })
  })

})
