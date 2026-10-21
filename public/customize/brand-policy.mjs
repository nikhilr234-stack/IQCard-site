// Every front renders an IQ mark at top-left, independently of this saved logo choice.
// Normalize legacy IQ placement; preserve custom artwork and identity.
export const BRAND_POLICY_VERSION = 'iq-top-left-v2';
export function applyBrandPolicy(configuration) {
  const result = structuredClone(configuration);
  if (result.logo?.mode === 'iq') Object.assign(result.logo, { align: 'left', x: 0, y: 0 });
  return result;
}
