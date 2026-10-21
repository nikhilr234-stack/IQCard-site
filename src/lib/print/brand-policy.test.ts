import { describe, it, expect } from 'vitest'
// @ts-expect-error Browser module.
import { applyBrandPolicy } from '../../../public/customize/brand-policy.mjs'
const saved = { identity: { name: 'Exact Saved Name', fineTune: { x: 9, y: -3, nameScale: .8, align: 'right' } }, logo: { mode: 'iq', align: 'right', x: 44, y: 22, scale: 1.2 } }
describe('mandatory IQ branding policy', () => {
  it('moves old IQ marks to top-left without changing name or mark size', () => {
    const before = structuredClone(saved), result = applyBrandPolicy(saved)
    expect(result.logo).toEqual({ mode: 'iq', align: 'left', x: 0, y: 0, scale: 1.2 })
    expect(result.identity).toEqual(saved.identity)
    expect(saved).toEqual(before)
  })
  it('preserves every custom-logo field including its original placement', () => {
    const custom = { ...saved, logo: { ...saved.logo, mode: 'custom', dataUrl: 'data:image/png;base64,saved', filename: 'own.png' } }
    expect(applyBrandPolicy(custom)).toEqual(custom)
  })
  it('preserves the saved opt-out field while the renderer independently enforces IQ branding', () => {
    const absent = { ...saved, logo: { ...saved.logo, mode: 'none' } }
    expect(applyBrandPolicy(absent)).toEqual(absent)
  })
})
