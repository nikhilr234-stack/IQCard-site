import { describe, it, expect } from 'vitest'
// @ts-expect-error Browser module served directly.
import { printGeometry, createPrintPdf, createStoredZip, withRasterDpi, cutContourSvg } from '../../../public/customize/print-files.mjs'

describe('physical print files', () => {
  it('keeps confirmed card size exact, including separate bleed/inset', () => {
    expect(printGeometry()).toMatchObject({ trimWidth: 85.6, trimHeight: 54, artWidth: 91.6, artHeight: 60, dpi: 600, pixelsWide: 2164, pixelsHigh: 1417 })
    expect(printGeometry({ inset: .5 })).toMatchObject({ trimWidth: 84.6, trimHeight: 53 })
  })
  it.each([{ bleed: -1 }, { inset: NaN }, { dpi: 0 }, { dpi: 450 }, { radius: 50 }, { safe: 30 }])('rejects invalid geometry %j', settings => {
    expect(() => printGeometry(settings)).toThrow()
  })
  it('builds a two-page PDF with correct mm boxes and byte-exact cross references', () => {
    const pdf = createPrintPdf([{ bytes: new Uint8Array([255,216,255,217]), width: 2164, height: 1417 }, { bytes: new Uint8Array([255,216,255,217]), width: 2164, height: 1417 }], printGeometry(), true)
    const body = new TextDecoder('latin1').decode(pdf)
    expect(body).toContain('/Count 2')
    expect(body).toContain('/TrimBox [22.6772 22.6772 265.3228 175.7480]')
    expect(body).toContain('/BleedBox [14.1732 14.1732 273.8268 184.2520]')
    const start = Number(body.match(/startxref\n(\d+)/)?.[1])
    expect(new TextDecoder().decode(pdf.slice(start, start + 4))).toBe('xref')
  })
  it('adds valid PNG DPI without losing image data', async () => {
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=', 'base64')
    const result = await withRasterDpi(new Blob([png]), 'image/png', 600)
    const bytes = Buffer.from(await result.arrayBuffer())
    const position = bytes.indexOf('pHYs')
    expect(position).toBeGreaterThan(0)
    expect(bytes.readUInt32BE(position + 4)).toBe(23622)
    expect(bytes[position + 12]).toBe(1)
    expect(bytes.includes(Buffer.from('IDAT'))).toBe(true)
  })
  it('sets JPEG JFIF inch density', async () => {
    const jpeg = new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1,1,0,0,1,0,1,0,0,255,217])
    const bytes = new Uint8Array(await (await withRasterDpi(new Blob([jpeg]), 'image/jpeg', 600)).arrayBuffer())
    expect([...bytes.slice(13,18)]).toEqual([1,2,88,2,88])
  })
  it('packs safe file names with standard ZIP signatures', () => {
    const zip = createStoredZip([{ name: 'front.png', bytes: new Uint8Array([1,2,3]) }])
    expect(new DataView(zip.buffer).getUint32(0,true)).toBe(0x04034b50)
    expect(new TextDecoder().decode(zip)).toContain('front.png')
    expect(() => createStoredZip([{ name: '../x', bytes: new Uint8Array() }])).toThrow()
  })
  it('keeps cutting paths out of art and provides a physical-size rounded contour', () => {
    const svg = cutContourSvg(printGeometry())
    expect(svg).toContain('width="85.6mm" height="54mm"')
    expect(svg).toContain('rx="3.18"')
  })
})
