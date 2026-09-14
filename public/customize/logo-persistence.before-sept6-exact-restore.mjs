const MAX_CUSTOM_LOGO_BYTES = 1_000_000
const SUPPORTED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const ALIGNMENTS = ['left', 'center', 'right']
const STEPS = ['core', 'material', 'identity', 'logo', 'craft', 'final']
const CORES = ['black', 'white']
const MATERIALS = ['Walnut', 'Oak', 'Linen', 'Leather', 'Basalt', 'Marble']
const CUSTOM_COLORS = [null, 'black', 'white', 'gray', 'silver', 'red', 'blue']
const FINISHES = ['matte', 'satin', 'gloss']
const IDENTITY_TONES = ['dark', 'light']
const IDENTITY_COMPOSITIONS = ['signature', 'editorial', 'minimal', 'centered', 'statement']
const SIDES = ['front', 'back']
const BACK_LAYOUTS = ['pure', 'branded', 'identity', 'custom']
const CRAFTS = ['printed', 'engrave', 'emboss', 'deboss', 'foil']
const INVALID = Symbol('invalid stored configuration value')

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function isRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
}

function boundedNumber(value, minimum, maximum, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : fallback
}

function compatibleEnum(value, allowed, fallback) {
  if (value === undefined) return fallback
  return allowed.includes(value) ? value : INVALID
}

function compatibleNumber(value, minimum, maximum, fallback) {
  if (value === undefined) return fallback
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : INVALID
}

function placement(value) {
  const logo = record(value)
  return {
    scale: boundedNumber(logo.scale, 0.5, 2, 1),
    x: boundedNumber(logo.x, -50, 50, 0),
    y: boundedNumber(logo.y, -40, 40, 0),
    align: ALIGNMENTS.includes(logo.align) ? logo.align : 'right',
  }
}

function filename(value) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized && normalized.length <= 255 ? normalized : null
}

function imageDataUrl(value) {
  if (typeof value !== 'string') return null
  const match = /^data:(image\/(?:png|jpeg|webp|svg\+xml));base64,([A-Za-z0-9+/]*={0,2})$/.exec(value)
  if (!match || !SUPPORTED_IMAGE_MIME_TYPES.includes(match[1])) return null

  const encoded = match[2]
  if (!encoded || encoded.length % 4 !== 0) return null
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) return null

  const padding = encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0
  const byteLength = (encoded.length / 4) * 3 - padding
  if (byteLength < 1 || byteLength > MAX_CUSTOM_LOGO_BYTES) return null

  return { dataUrl: value, mimeType: match[1] }
}

export function serializeLogoForStorage(value) {
  const logo = record(value)
  const savedPlacement = placement(logo)
  const image = logo.mode === 'custom' ? imageDataUrl(logo.dataUrl) : null
  const savedFilename = filename(logo.filename)

  if (!image || !savedFilename) {
    return {
      mode: 'iq',
      dataUrl: null,
      filename: null,
      mimeType: null,
      ...savedPlacement,
    }
  }

  return {
    mode: 'custom',
    dataUrl: image.dataUrl,
    filename: savedFilename,
    mimeType: image.mimeType,
    ...savedPlacement,
  }
}

export function restoreStoredLogo(value) {
  return {
    ...serializeLogoForStorage(value),
    objectUrl: null,
  }
}

export function validateLogoForCheckout(value) {
  if (record(value).mode !== 'custom') return { valid: true }
  if (serializeLogoForStorage(value).mode === 'custom') return { valid: true }
  return {
    valid: false,
    error: 'Re-upload the custom logo before checkout.',
  }
}

export function normalizeStoredConfiguration(value) {
  if (!isRecord(value)) return null
  const saved = record(value)
  if (saved.productFamily !== undefined && saved.productFamily !== 'classic') return null

  const legacySteps = { composition: 'logo', sides: 'craft' }
  const stepValue = saved.step === undefined ? 'final' : legacySteps[saved.step] ?? saved.step
  const step = compatibleEnum(stepValue, STEPS, 'final')
  const core = compatibleEnum(saved.core, CORES, 'black')
  const material = compatibleEnum(saved.material, MATERIALS, 'Walnut')
  const customColor = compatibleEnum(saved.customColor, CUSTOM_COLORS, null)
  const finish = compatibleEnum(saved.finish, FINISHES, 'matte')
  const side = compatibleEnum(saved.side, SIDES, 'front')
  const backLayout = compatibleEnum(saved.backLayout, BACK_LAYOUTS, 'pure')
  const craft = compatibleEnum(saved.craft, CRAFTS, 'engrave')
  if ([step, core, material, customColor, finish, side, backLayout, craft].includes(INVALID)) return null

  if (saved.identity !== undefined && !isRecord(saved.identity)) return null
  const savedIdentity = record(saved.identity)
  let name = 'YOUR NAME'
  if (savedIdentity.name !== undefined) {
    if (typeof savedIdentity.name !== 'string') return null
    const normalizedName = savedIdentity.name.trim().replace(/\s+/g, ' ')
    if (normalizedName) name = normalizedName
    if (name.length > 26) return null
  }
  const tone = compatibleEnum(savedIdentity.tone, IDENTITY_TONES, 'dark')
  const composition = compatibleEnum(savedIdentity.composition, IDENTITY_COMPOSITIONS, 'signature')
  if (tone === INVALID || composition === INVALID) return null

  if (savedIdentity.fineTune !== undefined && !isRecord(savedIdentity.fineTune)) return null
  const savedFineTune = record(savedIdentity.fineTune)
  const nameScale = compatibleNumber(savedFineTune.nameScale, 0.5, 2, 1)
  const nameX = compatibleNumber(savedFineTune.x, -50, 50, 0)
  const nameY = compatibleNumber(savedFineTune.y, -40, 40, 0)
  const nameAlign = compatibleEnum(savedFineTune.align, ALIGNMENTS, 'left')
  if ([nameScale, nameX, nameY, nameAlign].includes(INVALID)) return null

  if (saved.logo !== undefined && !isRecord(saved.logo)) return null
  const savedLogo = record(saved.logo)
  const logoMode = compatibleEnum(savedLogo.mode, ['iq', 'custom'], 'iq')
  const logoScale = compatibleNumber(savedLogo.scale, 0.5, 2, 1)
  const logoX = compatibleNumber(savedLogo.x, -50, 50, 0)
  const logoY = compatibleNumber(savedLogo.y, -40, 40, 0)
  const logoAlign = compatibleEnum(savedLogo.align, ALIGNMENTS, 'right')
  if ([logoMode, logoScale, logoX, logoY, logoAlign].includes(INVALID)) return null
  const logo = serializeLogoForStorage({
    ...savedLogo,
    mode: logoMode,
    scale: logoScale,
    x: logoX,
    y: logoY,
    align: logoAlign,
  })
  if (logoMode === 'custom' && logo.mode !== 'custom') return null

  return {
    step,
    core,
    material,
    customColor,
    finish,
    identity: {
      name,
      tone,
      composition,
      fineTune: { nameScale, x: nameX, y: nameY, align: nameAlign },
    },
    logo,
    side,
    backLayout,
    craft,
  }
}

function normalizeStoredDesignRecord(value) {
  if (!isRecord(value)) return null

  const saved = record(value)
  if (typeof saved.id !== 'string' || !saved.id.trim()) return null
  if (saved.schemaVersion !== undefined && saved.schemaVersion !== '1.0') return null
  if (saved.saveMode !== undefined && saved.saveMode !== 'manual' && saved.saveMode !== 'auto') return null
  const configuration = normalizeStoredConfiguration(saved.configuration)
  if (!configuration) return null

  return { ...saved, id: saved.id.trim(), configuration }
}

function isAutosave(value) {
  return record(value).saveMode === 'auto'
}

function oldestAutosaveIndex(records, startIndex = 0) {
  for (let index = records.length - 1; index >= startIndex; index -= 1) {
    if (isAutosave(records[index])) return index
  }
  return -1
}

const savedDesignError = 'This design is too large to save in this browser. Remove the custom logo and try again.'

export function savedDesignTarget({ silent, activeRecord }) {
  const normalizedActiveRecord = normalizeStoredDesignRecord(activeRecord)
  const hasActiveRecord = Boolean(normalizedActiveRecord)
  return {
    reuseActiveId: hasActiveRecord && (!silent || isAutosave(normalizedActiveRecord)),
    saveMode: silent ? 'auto' : 'manual',
  }
}

export function selectRestorableDesign(value) {
  const records = Array.isArray(value)
    ? value.map(normalizeStoredDesignRecord).filter(Boolean)
    : []

  return records.find(item => !isAutosave(item)) ?? records.find(isAutosave) ?? null
}

export function persistSavedDesignHistory({
  storage,
  key,
  newestRecord,
  existingRecords,
  maxRecords = 20,
}) {
  const normalizedNewest = normalizeStoredDesignRecord(newestRecord)
  const newestId = normalizedNewest?.id ?? null
  const history = Array.isArray(existingRecords)
    ? existingRecords.map(normalizeStoredDesignRecord).filter(Boolean)
    : []
  const limit = Number.isInteger(maxRecords) && maxRecords > 0 ? maxRecords : 20
  const records = [
    ...(normalizedNewest ? [normalizedNewest] : []),
    ...history.filter(item => !newestId || record(item).id !== newestId),
  ]
  const incomingAutosave = isAutosave(newestRecord)
  let incomingDropped = !normalizedNewest

  while (records.length > limit) {
    const autosaveIndex = oldestAutosaveIndex(records, 1)
    if (autosaveIndex >= 0) {
      records.splice(autosaveIndex, 1)
    } else if (incomingAutosave && !incomingDropped && records[0] === normalizedNewest) {
      records.shift()
      incomingDropped = true
    } else {
      records.pop()
    }
  }

  while (records.length > 0) {
    try {
      storage.setItem(key, JSON.stringify(records))
      return incomingDropped
        ? { ok: false, error: savedDesignError, records: [...records] }
        : { ok: true, records: [...records] }
    } catch {
      const autosaveIndex = oldestAutosaveIndex(records, 1)
      if (autosaveIndex >= 0) {
        records.splice(autosaveIndex, 1)
        continue
      }

      if (incomingAutosave && records[0] === normalizedNewest) {
        records.shift()
        if (records.length === 0) break
        try {
          storage.setItem(key, JSON.stringify(records))
          return { ok: false, error: savedDesignError, records: [...records] }
        } catch {
          break
        }
      }

      if (records.length === 1) {
        break
      }
      records.pop()
    }
  }

  return {
    ok: false,
    error: savedDesignError,
  }
}

export function persistCheckoutHandoffMarker({ storage, key, payload }) {
  const designId = record(payload).designId
  if (typeof designId !== 'string' || !designId.trim()) {
    return {
      ok: false,
      error: 'Your design was saved, but this browser could not store its recovery reference.',
    }
  }

  const marker = { designId: designId.trim() }
  try {
    storage.setItem(key, JSON.stringify(marker))
    return { ok: true, marker }
  } catch {
    return {
      ok: false,
      error: 'Your design was saved, but this browser could not store its recovery reference.',
    }
  }
}
