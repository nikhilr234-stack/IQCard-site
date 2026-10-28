/** Apply only edits made locally; retain independently saved server changes. */
export function recoverDraft<T>(current: T, baseline: T, local: T): { value: T; conflicts: boolean } {
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
  if (same(local, baseline)) return { value: current, conflicts: false }
  if (same(current, baseline) || same(current, local)) return { value: local, conflicts: false }
  const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
  if (record(current) && record(baseline) && record(local)) {
    const value: Record<string, unknown> = { ...current }
    let conflicts = false
    for (const key of Object.keys(local)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue
      const recovered = recoverDraft(current[key], baseline[key], local[key])
      value[key] = recovered.value
      conflicts ||= recovered.conflicts
    }
    return { value: value as T, conflicts }
  }
  return { value: local, conflicts: true }
}
