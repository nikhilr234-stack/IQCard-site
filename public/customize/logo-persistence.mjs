const MAX_CUSTOM_LOGO_BYTES = 1_000_000
const SUPPORTED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
const ALIGNMENTS = ['left', 'center', 'right']
const STEPS = ['core', 'material', 'identity', 'logo', 'craft', 'final']
const CORES = ['black', 'white']
const MATERIALS = ['White', 'Black', 'Graphite', 'Terracotta', 'Mustard', 'Oxblood', 'Walnut', 'Natural Oak', 'Travertine', 'Concrete', 'Ivory Marble', 'Oxidised Steel']
const CUSTOM_COLORS = ['black', 'white', 'gray', 'silver', 'red', 'blue']
const COMPOSITIONS = ['signature', 'editorial', 'minimal', 'centered', 'statement']
const BACK_LAYOUTS = ['pure', 'branded', 'identity', 'custom']
const CRAFTS = ['printed', 'engrave', 'emboss', 'deboss', 'foil']

function record(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function boundedNumber(value, minimum, maximum, fallback) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
    ? value
    : fallback
}

function placement(value) {
  const logo = record(value)
  return {
    scale: boundedNumber(logo.scale, 0.5, 2, 1),
    x: boundedNumber(logo.x, -50, 50, 0),
    y: boundedNumber(logo.y, -40, 40, 0),
    align: ALIGNMENTS.includes(logo.align) ? logo.align : 'left',
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

  if (!image) {
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
    filename: filename(logo.filename),
    mimeType: image.mimeType,
    ...savedPlacement,
  }
}

export function restoreStoredLogo(value) {
  const restored = serializeLogoForStorage(value)
  if (restored.mode === 'custom' && !restored.filename) {
    return { ...restored, mode: 'iq', dataUrl: null, filename: null, mimeType: null, objectUrl: null }
  }
  return { ...restored, objectUrl: null }
}

function allowed(value, values, fallback) {
  if (value === undefined) return fallback
  return values.includes(value) ? value : null
}

function normalizedFineTune(value) {
  const input = value === undefined ? {} : record(value)
  const nameScale = boundedNumber(input.nameScale, 0.5, 2, 1)
  const x = boundedNumber(input.x, -50, 50, 0)
  const y = boundedNumber(input.y, -40, 40, 0)
  const align = allowed(input.align, ALIGNMENTS, 'left')
  if (align === null || (input.nameScale !== undefined && nameScale === 1 && input.nameScale !== 1) ||
      (input.x !== undefined && x === 0 && input.x !== 0) || (input.y !== undefined && y === 0 && input.y !== 0)) return null
  return { nameScale, x, y, align }
}

export function normalizeStoredConfiguration(value) {
  const input = record(value)
  if (Object.keys(input).length === 0 && value !== undefined && value !== null) return null
  const step = allowed(input.step, STEPS, 'final')
  const core = allowed(input.core, CORES, 'black')
  const material = allowed(input.material, MATERIALS, 'Walnut')
  const customColor = input.customColor === undefined || input.customColor === null
    ? null
    : allowed(input.customColor, CUSTOM_COLORS, null)
  const finish = allowed(input.finish, ['matte'], 'matte')
  const side = allowed(input.side, ['front', 'back'], 'front')
  const backLayout = allowed(input.backLayout, BACK_LAYOUTS, 'pure')
  const craft = allowed(input.craft, CRAFTS, 'engrave')
  const identityInput = input.identity === undefined ? {} : record(input.identity)
  const tone = allowed(identityInput.tone, ['dark', 'light'], core === 'white' ? 'light' : 'dark')
  const composition = allowed(identityInput.composition, COMPOSITIONS, 'signature')
  const fineTune = normalizedFineTune(identityInput.fineTune)
  const name = typeof identityInput.name === 'string'
    ? identityInput.name.trim().slice(0, 26)
    : 'YOUR NAME'
  const logoInput = input.logo === undefined ? {} : record(input.logo)
  const logo = restoreStoredLogo(logoInput)
  const requestedCustomLogo = logoInput.mode === 'custom'
  const logoScale = boundedNumber(logoInput.scale, 0.5, 2, 1)
  const logoX = boundedNumber(logoInput.x, -50, 50, 0)
  const logoY = boundedNumber(logoInput.y, -40, 40, 0)
  const logoAlign = allowed(logoInput.align, ALIGNMENTS, 'left')
  const logoPlacementInvalid = logoAlign === null ||
    (logoInput.scale !== undefined && logoScale === 1 && logoInput.scale !== 1) ||
    (logoInput.x !== undefined && logoX === 0 && logoInput.x !== 0) ||
    (logoInput.y !== undefined && logoY === 0 && logoInput.y !== 0)
  if ([step, core, material, finish, side, backLayout, craft, tone, composition].includes(null) ||
      (input.customColor != null && customColor === null) || !fineTune ||
      logoPlacementInvalid || (requestedCustomLogo && logo.mode !== 'custom')) return null
  return {
    step,
    core,
    material,
    customColor,
    finish,
    identity: { name, tone, composition, fineTune },
    logo: { ...logo, objectUrl: undefined },
    side,
    backLayout,
    craft,
  }
}

function validSavedRecord(value) {
  const input = record(value)
  if (!input.id || (input.schemaVersion !== undefined && input.schemaVersion !== '1.0')) return false
  return normalizeStoredConfiguration(input.configuration) !== null
}

export function selectRestorableDesign(records) {
  const valid = Array.isArray(records) ? records.filter(validSavedRecord) : []
  return valid.find(item => item.saveMode !== 'auto') || valid[0] || null
}

export function savedDesignTarget({ silent, activeRecord }) {
  if (!activeRecord) return { reuseActiveId: false, saveMode: silent ? 'auto' : 'manual' }
  if (silent) return { reuseActiveId: activeRecord.saveMode === 'auto', saveMode: 'auto' }
  return { reuseActiveId: true, saveMode: 'manual' }
}

function writeHistory(storage, key, records) {
  storage.setItem(key, JSON.stringify(records))
  return { ok: true, records }
}

export function persistSavedDesignHistory({ storage, key, newestRecord, existingRecords = [], maxRecords = 20 }) {
  const existing = existingRecords.filter(validSavedRecord).filter(item => item.id !== newestRecord.id)
  let records = [newestRecord, ...existing]
  if (records.length > maxRecords) {
    const manual = records.filter(item => item.saveMode !== 'auto')
    const auto = records.filter(item => item.saveMode === 'auto')
    records = [...manual, ...auto].slice(0, maxRecords)
  }
  while (records.length) {
    try {
      const result = writeHistory(storage, key, records)
      return records.includes(newestRecord) ? result : { ...result, ok: false }
    } catch (error) {
      const removableAuto = records.findLastIndex((item, index) => index > 0 && item.saveMode === 'auto')
      if (removableAuto >= 0) records.splice(removableAuto, 1)
      else if (newestRecord.saveMode === 'auto' && records.some(item => item !== newestRecord && item.saveMode !== 'auto')) records = records.filter(item => item !== newestRecord)
      else if (records.length > 1) records.pop()
      else break
    }
  }
  return { ok: false, error: 'This design is too large to save in this browser. Remove the custom logo and try again.' }
}

export function validateLogoForCheckout(value) {
  const input = record(value)
  if (input.mode !== 'custom') return { valid: true }
  const restored = restoreStoredLogo(input)
  return restored.mode === 'custom'
    ? { valid: true }
    : { valid: false, error: 'Re-upload the custom logo before checkout.' }
}

export function persistCheckoutHandoffMarker({ storage, key, payload }) {
  const marker = { designId: payload?.designId }
  try {
    storage.setItem(key, JSON.stringify(marker))
    return { ok: true, marker }
  } catch (error) {
    return { ok: false, error: 'Your design was saved, but this browser could not store its recovery reference.' }
  }
}
