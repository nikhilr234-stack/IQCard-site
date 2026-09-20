import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error The browser persistence module is served directly from public/.
import { normalizeStoredConfiguration, persistCheckoutHandoffMarker, persistSavedDesignHistory, restoreStoredLogo, savedDesignTarget, selectRestorableDesign, serializeLogoForStorage, validateLogoForCheckout } from '../../../public/customize/logo-persistence.mjs'

const placement = { scale: 0.85, x: 12, y: -4, align: 'right' }
const builtInLogo = { mode: 'iq', dataUrl: null, filename: null, mimeType: null, scale: 1, x: 0, y: 0, align: 'right' }

type TestConfiguration = {
  step: string
  core: string
  material: string
  customColor: string | null
  finish: string
  identity: {
    name: string
    tone: string
    composition: string
    fineTune: { nameScale: number; x: number; y: number; align: string }
  }
  logo: {
    mode: string
    dataUrl: string | null
    filename: string | null
    mimeType: string | null
    scale: number
    x: number
    y: number
    align: string
  }
  side: string
  backLayout: string
  craft: string
}

function savedRecord(id: string, saveMode: 'manual' | 'auto' | undefined, name: string): {
  id: string
  schemaVersion: string
  saveMode?: 'manual' | 'auto'
  configuration: TestConfiguration
} {
  return {
    id,
    schemaVersion: '1.0',
    ...(saveMode ? { saveMode } : {}),
    configuration: {
      step: 'final',
      core: 'black',
      material: 'Walnut',
      customColor: null,
      finish: 'matte',
      identity: {
        name,
        tone: 'dark',
        composition: 'signature',
        fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
      },
      logo: { ...builtInLogo },
      side: 'front',
      backLayout: 'pure',
      craft: 'engrave',
    },
  }
}

describe('custom-logo browser persistence', () => {
  it('defaults a missing saved logo alignment to left without changing an explicit choice', () => {
    expect(restoreStoredLogo({ mode: 'iq', dataUrl: null, filename: null, mimeType: null })).toMatchObject({ align: 'left' })
    expect(restoreStoredLogo({ mode: 'iq', dataUrl: null, filename: null, mimeType: null, align: 'right' })).toMatchObject({ align: 'right' })
  })

  it('restores the latest explicit save instead of a newer background autosave', () => {
    const explicitSave = { id: 'manual', saveMode: 'manual', configuration: { material: 'Ivory Marble' } }
    const backgroundSave = { id: 'auto', saveMode: 'auto', configuration: { material: 'Walnut' } }

    expect(selectRestorableDesign([backgroundSave, explicitSave])).toMatchObject(explicitSave)
  })

  it('keeps legacy saved records restorable as explicit saves', () => {
    const legacySave = { id: 'legacy', configuration: { material: 'Ivory Marble' } }
    const backgroundSave = { id: 'auto', saveMode: 'auto', configuration: { material: 'Walnut' } }

    expect(selectRestorableDesign([backgroundSave, legacySave])).toMatchObject(legacySave)
  })

  it('keeps an explicit checkpoint when a same-session edit autosaves', () => {
    const explicitSave = savedRecord('manual-checkpoint', 'manual', 'Explicit Checkpoint')
    const target = savedDesignTarget({ silent: true, activeRecord: explicitSave })
    const editedAutosave = savedRecord(target.reuseActiveId ? explicitSave.id : 'edited-autosave', target.saveMode, 'Edited Draft')
    let stored = ''

    persistSavedDesignHistory({
      storage: { setItem(_key: string, value: string) { stored = value } },
      key: 'designs',
      newestRecord: editedAutosave,
      existingRecords: [explicitSave],
    })

    const records = JSON.parse(stored)
    expect(records.map((record: { id: string }) => record.id)).toEqual(['edited-autosave', 'manual-checkpoint'])
    expect(selectRestorableDesign(records)).toEqual(explicitSave)
  })

  it('promotes the active autosave when the user explicitly saves it', () => {
    expect(savedDesignTarget({
      silent: false,
      activeRecord: savedRecord('active-auto', 'auto', 'Edited Draft'),
    })).toEqual({ reuseActiveId: true, saveMode: 'manual' })
  })

  it('does not reuse a legacy checkpoint for a background autosave', () => {
    expect(savedDesignTarget({
      silent: true,
      activeRecord: savedRecord('legacy-checkpoint', undefined, 'Legacy Checkpoint'),
    })).toEqual({ reuseActiveId: false, saveMode: 'auto' })
  })

  it('stores the built-in IQ logo without session-only or custom asset fields', () => {
    const stored = serializeLogoForStorage({
      mode: 'iq',
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      objectUrl: 'blob:https://iqcard.in/session-only',
      filename: 'stale.png',
      mimeType: 'image/png',
      ...placement,
    })

    expect(stored).toEqual({
      mode: 'iq',
      dataUrl: null,
      filename: null,
      mimeType: null,
      ...placement,
    })
    expect(stored).not.toHaveProperty('objectUrl')
    expect(restoreStoredLogo(stored)).toEqual({ ...stored, objectUrl: null })
  })

  it('round-trips a valid custom data URL while discarding its object URL', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8='
    const stored = serializeLogoForStorage({
      mode: 'custom',
      dataUrl,
      objectUrl: 'blob:https://iqcard.in/session-only',
      filename: ' mark.png ',
      mimeType: 'image/not-authoritative',
      ...placement,
    })

    expect(stored).toEqual({
      mode: 'custom',
      dataUrl,
      filename: 'mark.png',
      mimeType: 'image/png',
      ...placement,
    })
    expect(stored).not.toHaveProperty('objectUrl')
    expect(restoreStoredLogo(stored)).toEqual({ ...stored, objectUrl: null })
  })

  it('safely downgrades legacy custom metadata that has no image bytes', () => {
    expect(restoreStoredLogo({
      mode: 'custom',
      dataUrl: null,
      filename: 'legacy.svg',
      mimeType: 'image/svg+xml',
      ...placement,
    })).toEqual({
      mode: 'iq',
      dataUrl: null,
      objectUrl: null,
      filename: null,
      mimeType: null,
      ...placement,
    })
  })

  it.each([null, '', '   ', `${'x'.repeat(252)}.png`])('requires a bounded non-empty filename to restore custom mode (%j)', (filename) => {
    expect(restoreStoredLogo({
      mode: 'custom',
      dataUrl: 'data:image/png;base64,aGVsbG8=',
      filename,
      mimeType: 'image/png',
      ...placement,
    }).mode).toBe('iq')
  })

  it('does not restore an unsupported image MIME as a custom logo', () => {
    expect(restoreStoredLogo({
      mode: 'custom',
      dataUrl: 'data:image/gif;base64,aGVsbG8=',
      filename: 'mark.gif',
      mimeType: 'image/gif',
      ...placement,
    }).mode).toBe('iq')
  })

  it('persists one decoded megabyte and rejects the next byte', () => {
    const atLimit = `data:image/webp;base64,${Buffer.alloc(1_000_000).toString('base64')}`
    const overLimit = `data:image/webp;base64,${Buffer.alloc(1_000_001).toString('base64')}`
    const logo = { mode: 'custom', filename: 'mark.webp', mimeType: 'image/webp', ...placement }

    expect(serializeLogoForStorage({ ...logo, dataUrl: atLimit }).mode).toBe('custom')
    expect(serializeLogoForStorage({ ...logo, dataUrl: overLimit }).mode).toBe('iq')
  })

  it.each([
    ['metadata only', { mode: 'custom', dataUrl: null, filename: 'mark.png', mimeType: 'image/png', ...placement }],
    ['missing filename', { mode: 'custom', dataUrl: 'data:image/png;base64,aGVsbG8=', filename: null, mimeType: 'image/png', ...placement }],
    ['unsupported MIME', { mode: 'custom', dataUrl: 'data:image/gif;base64,aGVsbG8=', filename: 'mark.gif', mimeType: 'image/gif', ...placement }],
    ['oversized image', { mode: 'custom', dataUrl: `data:image/webp;base64,${Buffer.alloc(1_000_001).toString('base64')}`, filename: 'mark.webp', mimeType: 'image/webp', ...placement }],
  ])('rejects %s during behavioral checkout validation', (_label, logo) => {
    expect(validateLogoForCheckout(logo)).toEqual({
      valid: false,
      error: 'Re-upload the custom logo before checkout.',
    })
  })

  it('accepts a complete canonical custom logo during behavioral checkout validation', () => {
    expect(validateLogoForCheckout({
      mode: 'custom',
      dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      filename: 'mark.svg',
      mimeType: 'image/svg+xml',
      ...placement,
    })).toEqual({ valid: true })
  })

  it('retries saved-design persistence by evicting the oldest record until the newest fits', () => {
    const attempts: string[][] = []
    let stored = ''
    const storage = {
      setItem(_key: string, value: string) {
        const ids = (JSON.parse(value) as Array<{ id: string }>).map(record => record.id)
        attempts.push(ids)
        if (ids.length > 2) throw new Error('QuotaExceededError')
        stored = value
      },
    }
    const newestRecord = savedRecord('newest', undefined, 'Newest')
    const existingRecords = [
      savedRecord('old-1', undefined, 'Old 1'),
      savedRecord('old-2', undefined, 'Old 2'),
      savedRecord('old-3', undefined, 'Old 3'),
    ]

    const result = persistSavedDesignHistory({
      storage,
      key: 'designs',
      newestRecord,
      existingRecords,
      maxRecords: 20,
    })

    expect(attempts).toEqual([
      ['newest', 'old-1', 'old-2', 'old-3'],
      ['newest', 'old-1', 'old-2'],
      ['newest', 'old-1'],
    ])
    expect(JSON.parse(stored)).toEqual([newestRecord, existingRecords[0]])
    expect(result).toEqual({ ok: true, records: [newestRecord, existingRecords[0]] })
  })

  it('drops an incoming autosave instead of evicting the only manual checkpoint for quota', () => {
    const manual = savedRecord('manual', 'manual', 'Manual Checkpoint')
    const autosave = savedRecord('auto', 'auto', 'Edited Draft')
    const attempts: string[][] = []
    let stored = ''
    const result = persistSavedDesignHistory({
      storage: {
        setItem(_key: string, value: string) {
          const ids = (JSON.parse(value) as Array<{ id: string }>).map(record => record.id)
          attempts.push(ids)
          if (ids.includes('auto')) throw new Error('QuotaExceededError')
          stored = value
        },
      },
      key: 'designs',
      newestRecord: autosave,
      existingRecords: [manual],
    })

    expect(attempts).toEqual([['auto', 'manual'], ['manual']])
    expect(JSON.parse(stored)).toEqual([manual])
    expect(result).toMatchObject({ ok: false, records: [manual] })
  })

  it('evicts an older autosave before an older manual checkpoint for quota', () => {
    const newestManual = savedRecord('new-manual', 'manual', 'Newest Manual')
    const olderAuto = savedRecord('old-auto', 'auto', 'Old Draft')
    const olderManual = savedRecord('old-manual', 'manual', 'Older Manual')
    const attempts: string[][] = []
    let stored = ''
    const result = persistSavedDesignHistory({
      storage: {
        setItem(_key: string, value: string) {
          const ids = (JSON.parse(value) as Array<{ id: string }>).map(record => record.id)
          attempts.push(ids)
          if (ids.length > 2) throw new Error('QuotaExceededError')
          stored = value
        },
      },
      key: 'designs',
      newestRecord: newestManual,
      existingRecords: [olderAuto, olderManual],
    })

    expect(attempts).toEqual([['new-manual', 'old-auto', 'old-manual'], ['new-manual', 'old-manual']])
    expect(JSON.parse(stored)).toEqual([newestManual, olderManual])
    expect(result).toEqual({ ok: true, records: [newestManual, olderManual] })
  })

  it('drops only the incoming autosave when the history limit contains manual checkpoints', () => {
    const newestManual = savedRecord('newest-manual', 'manual', 'Newest Manual')
    const olderManual = savedRecord('older-manual', 'manual', 'Older Manual')
    const incomingAuto = savedRecord('incoming-auto', 'auto', 'Edited Draft')
    let stored = ''

    const result = persistSavedDesignHistory({
      storage: { setItem(_key: string, value: string) { stored = value } },
      key: 'designs',
      newestRecord: incomingAuto,
      existingRecords: [newestManual, olderManual],
      maxRecords: 1,
    })

    expect(JSON.parse(stored)).toEqual([newestManual])
    expect(result).toMatchObject({ ok: false, records: [newestManual] })
  })

  it('reports a clear error after retrying with only the newest design', () => {
    const attempts: string[][] = []
    const storage = {
      setItem(_key: string, value: string) {
        attempts.push((JSON.parse(value) as Array<{ id: string }>).map(record => record.id))
        throw new Error('QuotaExceededError')
      },
    }

    const result = persistSavedDesignHistory({
      storage,
      key: 'designs',
      newestRecord: savedRecord('newest', undefined, 'Newest'),
      existingRecords: [savedRecord('oldest', undefined, 'Oldest')],
    })

    expect(attempts).toEqual([['newest', 'oldest'], ['newest']])
    expect(result).toEqual({
      ok: false,
      error: 'This design is too large to save in this browser. Remove the custom logo and try again.',
    })
  })

  it('skips malformed and incompatible manual history for the newest valid manual checkpoint', () => {
    const invalidCustomLogo = {
      id: 'missing-logo-bytes',
      schemaVersion: '1.0',
      saveMode: 'manual',
      configuration: { logo: { mode: 'custom', dataUrl: null, filename: 'mark.png', mimeType: 'image/png' } },
    }
    const unsupportedVersion = { ...savedRecord('future', 'manual', 'Future'), schemaVersion: '2.0' }
    const validManual = savedRecord('valid-manual', 'manual', 'Valid Manual')
    const validAuto = savedRecord('valid-auto', 'auto', 'Valid Auto')

    expect(selectRestorableDesign([
      'corrupt',
      { id: 'bad-configuration', saveMode: 'manual', configuration: 'corrupt' },
      invalidCustomLogo,
      unsupportedVersion,
      validManual,
      validAuto,
    ])).toEqual(validManual)
  })

  it('falls back to the newest valid autosave when manual history is incompatible', () => {
    const invalidManual = {
      id: 'invalid-manual',
      saveMode: 'manual',
      configuration: { logo: { mode: 'custom', dataUrl: null, filename: 'mark.svg', mimeType: 'image/svg+xml' } },
    }
    const validAuto = savedRecord('valid-auto', 'auto', 'Valid Auto')

    expect(selectRestorableDesign([invalidManual, { configuration: [] }, validAuto])).toEqual(validAuto)
  })

  it('evicts corrupt history before retaining a valid manual checkpoint at the history limit', () => {
    const corrupt = { id: 'corrupt', saveMode: 'manual', configuration: 'corrupt' }
    const manual = savedRecord('manual', 'manual', 'Manual Checkpoint')
    const autosave = savedRecord('auto', 'auto', 'Edited Draft')
    let stored = ''

    const result = persistSavedDesignHistory({
      storage: { setItem(_key: string, value: string) { stored = value } },
      key: 'designs',
      newestRecord: autosave,
      existingRecords: [corrupt, manual],
      maxRecords: 1,
    })

    expect(JSON.parse(stored)).toEqual([manual])
    expect(result).toMatchObject({ ok: false, records: [manual] })
  })

  it('removes corrupt history before quota retry and preserves the valid manual checkpoint', () => {
    const corrupt = { id: 'corrupt', saveMode: 'manual', configuration: 'corrupt' }
    const manual = savedRecord('manual', 'manual', 'Manual Checkpoint')
    const autosave = savedRecord('auto', 'auto', 'Edited Draft')
    const attempts: string[][] = []
    let stored = ''

    const result = persistSavedDesignHistory({
      storage: {
        setItem(_key: string, value: string) {
          const ids = (JSON.parse(value) as Array<{ id: string }>).map(record => record.id)
          attempts.push(ids)
          if (ids.includes('auto')) throw new Error('QuotaExceededError')
          stored = value
        },
      },
      key: 'designs',
      newestRecord: autosave,
      existingRecords: [corrupt, manual],
    })

    expect(attempts).toEqual([['auto', 'manual'], ['manual']])
    expect(JSON.parse(stored)).toEqual([manual])
    expect(result).toMatchObject({ ok: false, records: [manual] })
  })

  it.each([
    ['step', (configuration: TestConfiguration) => { configuration.step = 'future' }],
    ['core', (configuration: TestConfiguration) => { configuration.core = 'future' }],
    ['material', (configuration: TestConfiguration) => { configuration.material = 'future' }],
    ['custom color', (configuration: TestConfiguration) => { configuration.customColor = 'ultraviolet' }],
    ['finish', (configuration: TestConfiguration) => { configuration.finish = 'future' }],
    ['identity tone', (configuration: TestConfiguration) => { configuration.identity.tone = 'future' }],
    ['identity composition', (configuration: TestConfiguration) => { configuration.identity.composition = 'future' }],
    ['identity alignment', (configuration: TestConfiguration) => { configuration.identity.fineTune.align = 'future' }],
    ['logo alignment', (configuration: TestConfiguration) => { configuration.logo.align = 'future' }],
    ['side', (configuration: TestConfiguration) => { configuration.side = 'future' }],
    ['back layout', (configuration: TestConfiguration) => { configuration.backLayout = 'future' }],
    ['craft', (configuration: TestConfiguration) => { configuration.craft = 'future' }],
  ])('skips a newer manual with unsupported %s and restores the older valid manual', (_field, mutate) => {
    const invalidManual = savedRecord('invalid-manual', 'manual', 'Invalid Manual')
    mutate(invalidManual.configuration)
    const validManual = savedRecord('valid-manual', 'manual', 'Valid Manual')
    const validAuto = savedRecord('valid-auto', 'auto', 'Valid Auto')

    expect(selectRestorableDesign([invalidManual, validManual, validAuto])).toEqual(validManual)
  })

  it('falls back to a valid autosave when every manual has invalid semantic values', () => {
    const invalidManual = savedRecord('invalid-manual', 'manual', 'Invalid Manual')
    invalidManual.configuration.core = 'future'
    const validAuto = savedRecord('valid-auto', 'auto', 'Valid Auto')

    expect(selectRestorableDesign([invalidManual, validAuto])).toEqual(validAuto)
  })

  it.each([
    ['identity scale', (configuration: TestConfiguration) => { configuration.identity.fineTune.nameScale = Number.POSITIVE_INFINITY }],
    ['identity position', (configuration: TestConfiguration) => { configuration.identity.fineTune.x = 51 }],
    ['logo scale', (configuration: TestConfiguration) => { configuration.logo.scale = 0.49 }],
    ['logo position', (configuration: TestConfiguration) => { configuration.logo.y = -41 }],
  ])('skips a newer manual with an unsafe %s value', (_field, mutate) => {
    const invalidManual = savedRecord('invalid-manual', 'manual', 'Invalid Manual')
    mutate(invalidManual.configuration)
    const validManual = savedRecord('valid-manual', 'manual', 'Valid Manual')

    expect(selectRestorableDesign([invalidManual, validManual])).toEqual(validManual)
  })

  it('normalizes a valid partial legacy configuration into render-safe values', () => {
    expect(normalizeStoredConfiguration({ material: 'Ivory Marble' })).toEqual({
      step: 'final',
      core: 'black',
      material: 'Ivory Marble',
      customColor: null,
      finish: 'matte',
      identity: {
        name: 'YOUR NAME',
        tone: 'dark',
        composition: 'signature',
        fineTune: { nameScale: 1, x: 0, y: 0, align: 'left' },
      },
      logo: { ...builtInLogo, align: 'left', objectUrl: undefined },
      side: 'front',
      backLayout: 'pure',
      craft: 'engrave',
    })
  })

  it('keeps a complete custom-logo asset and canonicalizes its MIME type for restore', () => {
    const record = savedRecord('custom', 'manual', 'Custom Logo')
    record.configuration.logo = {
      mode: 'custom',
      dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      filename: ' mark.svg ',
      mimeType: 'not-authoritative',
      ...placement,
    }

    expect(normalizeStoredConfiguration(record.configuration)?.logo).toEqual({
      mode: 'custom',
      dataUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      filename: 'mark.svg',
      mimeType: 'image/svg+xml',
      ...placement,
    })
  })

  it('keeps valid logo bytes exactly once in the canonical handoff and stores only its recovery identifier locally', () => {
    const dataUrl = 'data:image/png;base64,aGVsbG8='
    const logo = serializeLogoForStorage({
      mode: 'custom',
      dataUrl,
      filename: 'mark.png',
      mimeType: 'image/png',
      ...placement,
    })
    const handoff = { schemaVersion: '1.0', designId: 'IQD-ABC123', configuration: { logo } }
    const writes: string[] = []
    const result = persistCheckoutHandoffMarker({
      storage: { setItem(_key: string, value: string) { writes.push(value) } },
      key: 'handoff',
      payload: handoff,
    })

    expect(JSON.stringify(handoff).split(dataUrl)).toHaveLength(2)
    expect(writes).toEqual(['{"designId":"IQD-ABC123"}'])
    expect(writes[0]).not.toContain(dataUrl)
    expect(result).toEqual({ ok: true, marker: { designId: 'IQD-ABC123' } })
  })

  it('maps a handoff marker write failure instead of silently ignoring it', () => {
    const result = persistCheckoutHandoffMarker({
      storage: { setItem() { throw new Error('QuotaExceededError') } },
      key: 'handoff',
      payload: { designId: 'IQD-ABC123', configuration: { logo: { dataUrl: 'large-bytes' } } },
    })

    expect(result).toEqual({
      ok: false,
      error: 'Your design was saved, but this browser could not store its recovery reference.',
    })
  })

  it('releases the previous session blob before a saved logo replaces it', () => {
    const html = readFileSync(resolve(process.cwd(), 'public/customize/index.html'), 'utf8')
    const restoreSource = html.slice(html.indexOf('function restoreSavedDesign'), html.indexOf('function renderOrderReview'))

    expect(restoreSource).toContain('URL.revokeObjectURL(configuration.logo.objectUrl)')
  })
})
