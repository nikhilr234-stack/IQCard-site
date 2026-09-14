export function clampMobileAngle(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const MOBILE_INSPECTION_POSES = {
  front: { x: 6, y: -12 },
  edge: { x: 10, y: 90 },
  back: { x: 6, y: 180 }
};

export function inspectionPoseForView(view) {
  return { ...(MOBILE_INSPECTION_POSES[view] || MOBILE_INSPECTION_POSES.front) };
}

export function mobileInspectionPose({ baseX, baseY, startX, currentX }) {
  return {
    x: baseX,
    y: clampMobileAngle(baseY + (currentX - startX) * 0.55, -12, 180)
  };
}

export function nearestMobileInspectionView(y) {
  return Object.entries(MOBILE_INSPECTION_POSES).reduce((nearest, [view, pose]) =>
    Math.abs(y - pose.y) < Math.abs(y - MOBILE_INSPECTION_POSES[nearest].y) ? view : nearest
  , 'front');
}

export function snapMobilePose(pose) {
  return inspectionPoseForView(nearestMobileInspectionView(pose.y));
}

export function mobileStepScrollTop({ scrollY, controlsTop, stageHeight }) {
  return Math.max(0, scrollY + controlsTop - stageHeight);
}
