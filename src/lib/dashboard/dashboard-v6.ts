export const LIVE_WIDGETS = ['identity', 'analytics', 'requests', 'content', 'spaces', 'share', 'card'] as const

export type LiveWidgetKey = typeof LIVE_WIDGETS[number]
export function handoffIdentityName(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const configuration = (payload as { configuration?: unknown }).configuration
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) return null
  const identity = (configuration as { identity?: unknown }).identity
  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) return null
  const name = String((identity as { name?: unknown }).name ?? '').trim()
  if (!name || name.toUpperCase() === 'YOUR NAME' || name.split(/\s+/).length < 2) return null
  return name
}

export function normalizeWidgetOrder(order: string[]): LiveWidgetKey[] {
  const valid = order.filter((key): key is LiveWidgetKey => LIVE_WIDGETS.includes(key as LiveWidgetKey))
  return [...new Set([...valid, ...LIVE_WIDGETS])]
}
