import { describe, expect, it } from 'vitest'
// @ts-expect-error The browser-served helper is intentionally kept as a public ESM asset.
import { clampMobileAngle, inspectionPoseForView, mobileInspectionPose, mobileStepScrollTop, nearestMobileInspectionView, snapMobilePose } from '../../../public/customize/mobile-inspection.mjs'

describe('mobile inspection pose', () => {
  it('turns horizontal drag into a yaw angle', () => {
    expect(mobileInspectionPose({ baseX: 6, baseY: -12, startX: 10, startY: 10, currentX: 70, currentY: 10 }).y).toBeGreaterThan(-12)
  })

  it('leaves pitch unchanged during vertical finger movement', () => {
    expect(mobileInspectionPose({ baseX: 6, baseY: 90, startX: 10, startY: 10, currentX: 10, currentY: 70 })).toEqual({ x: 6, y: 90 })
  })

  it('covers the complete front-to-back inspection range', () => {
    expect(clampMobileAngle(240, -12, 180)).toBe(180)
    expect(clampMobileAngle(-120, -12, 180)).toBe(-12)
  })

  it.each([
    ['front', -12],
    ['edge', 90],
    ['back', 180],
  ])('provides an exact %s button pose', (view, y) => {
    expect(inspectionPoseForView(view)).toEqual({ x: view === 'edge' ? 10 : 6, y })
  })

  it('snaps a released drag to the nearest named view', () => {
    expect(nearestMobileInspectionView(66)).toBe('edge')
    expect(snapMobilePose({ x: 3, y: 151 })).toEqual({ x: 6, y: 180 })
  })

  it('places the next mobile panel directly below the sticky card', () => {
    expect(mobileStepScrollTop({ scrollY: 640, controlsTop: 120, stageHeight: 280 })).toBe(480)
    expect(mobileStepScrollTop({ scrollY: 40, controlsTop: 80, stageHeight: 280 })).toBe(0)
  })
})
