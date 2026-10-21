// Applies to current and legacy designs. Custom artwork and identity are preserved.
export const BRAND_POLICY_VERSION = 'iq-top-left-v1';
export function applyBrandPolicy(configuration) {
  const result = structuredClone(configuration);
  if (result.logo?.mode === 'iq') Object.assign(result.logo, { align: 'left', x: 0, y: 0 });
  return result;
}
