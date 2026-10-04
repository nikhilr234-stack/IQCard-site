import { normalizeStoredConfiguration } from './logo-persistence.mjs'

export async function loadOwnedAtelierDesign(designId, fetchDesign = fetch) {
  const response = await fetchDesign(`/api/card-design?design=${encodeURIComponent(designId || '')}`, { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw new Error('Your saved card could not be loaded. Return to your dashboard and try again.')
  const record = await response.json()
  if (!record?.id || (designId && record.id !== designId)) throw new Error('The saved card does not match this design.')
  const configuration = normalizeStoredConfiguration(record.configuration)
  if (!configuration) throw new Error('The saved card configuration is unavailable.')
  return { id: record.id, configuration: { ...configuration, step: 'final' } }
}

export async function saveOwnedAtelierDesign(id, payload, saveDesign = fetch) {
  const response = await saveDesign('/api/card-design', { method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, payload }) })
  if (!response.ok) throw new Error('Your dashboard card could not be saved. Please try again.')
  const saved = await response.json()
  if (saved?.id !== id) throw new Error('The saved card did not match your design.')
  return saved
}
