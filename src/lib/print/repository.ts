import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { type CanonicalCardConfiguration } from '@/lib/customizer/card-configuration'
import { readPrintableCard } from './design'

export type PrintSource = 'order' | 'registration' | 'handoff'
export type PrintDesignSummary = { id: string; source: PrintSource; designId: string; email: string; name?: string | null; material?: string | null; createdAt: string; label: string; accountLinked: boolean }
export type PrintDesign = PrintDesignSummary & { configuration: CanonicalCardConfiguration; revision: string; frozen: boolean }
export function validPrintLookup(source: unknown, id: unknown): source is PrintSource {
  return ['order', 'registration', 'handoff'].includes(String(source)) && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
type Row = Record<string, unknown>
type PagedQuery = { range(from: number, to: number): PromiseLike<{ data: Row[] | null; error: { code?: string } | null }> }
// Read every page; account registration and payment are not print eligibility rules.
async function allRows(query: PagedQuery, optionalTable = false): Promise<Row[]> {
  const rows: Row[] = [], size = 500
  for (let offset = 0; ; offset += size) {
    const { data, error } = await query.range(offset, offset + size - 1)
    if (error) {
      if (optionalTable && ['42P01', 'PGRST205'].includes(error.code ?? '')) return []
      throw new Error('Unable to load print designs.')
    }
    rows.push(...(data ?? []))
    if (!data || data.length < size) return rows
  }
}
const text = (value: unknown) => typeof value === 'string' ? value : ''
const accountLabel = (row: Row) => row.owner_id ? 'Account linked' : 'Account not linked'
// Never put a still-usable email claim token in an admin link or API response.
function handoffPrintId(token: unknown): string {
  const hash = createHash('sha256').update(`iq-print:${String(token)}`).digest('hex').slice(0, 32)
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`
}
export async function listPrintDesigns(): Promise<PrintDesignSummary[]> {
  const db = createAdminClient()
  const [orders, registrations, handoffs] = await Promise.all([
    allRows(db.from('paid_orders').select('id,design_id,email,created_at,order_number,print_name:card_snapshot->configuration->identity->>name,print_material:card_snapshot->configuration->>material').order('created_at', { ascending: false }).order('id'), true),
    allRows(db.from('registration_intents').select('id,design_id,email,status,owner_id,created_at,print_name:design_payload->configuration->identity->>name,print_material:design_payload->configuration->>material').order('created_at', { ascending: false }).order('id')),
    allRows(db.from('checkout_handoffs').select('token,owner_id,design_id,email,created_at,print_name:payload->configuration->identity->>name,print_material:payload->configuration->>material').order('created_at', { ascending: false }).order('token')),
  ])
  const linkedEmails = new Set([...registrations, ...handoffs].filter(row => row.owner_id).map(row => text(row.email).toLowerCase()))
  const summary = (row: Row) => ({ designId: text(row.design_id), email: text(row.email), name: text(row.print_name), material: text(row.print_material), createdAt: text(row.created_at) })
  return [
    ...orders.map(row => ({ ...summary(row), id: text(row.id), source: 'order' as const, accountLinked: linkedEmails.has(text(row.email).toLowerCase()), label: `Order ${row.order_number} · frozen snapshot` })),
    ...registrations.map(row => ({ ...summary(row), id: text(row.id), source: 'registration' as const, accountLinked: Boolean(row.owner_id), label: `${accountLabel(row)} · saved registration design` })),
    ...handoffs.map(row => ({ ...summary(row), id: handoffPrintId(row.token), source: 'handoff' as const, accountLinked: Boolean(row.owner_id), label: `${accountLabel(row)} · legacy saved design` })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
export async function getPrintDesign(source: PrintSource, id: string): Promise<PrintDesign | null> {
  if (!validPrintLookup(source, id)) return null
  const db = createAdminClient()
  let result
  if (source === 'order') result = await db.from('paid_orders').select('id,design_id,email,created_at,order_number,card_snapshot').eq('id', id).maybeSingle()
  else if (source === 'registration') result = await db.from('registration_intents').select('id,design_id,email,status,owner_id,created_at,design_payload').eq('id', id).maybeSingle()
  else {
    const candidates = await allRows(db.from('checkout_handoffs').select('token').order('created_at', { ascending: false }).order('token'))
    const selected = candidates.find(row => handoffPrintId(row.token) === id)
    result = selected
      ? await db.from('checkout_handoffs').select('owner_id,design_id,email,created_at,payload').eq('token', text(selected.token)).maybeSingle()
      // Existing links used the owner ID; keep those links working.
      : await db.from('checkout_handoffs').select('owner_id,design_id,email,created_at,payload').eq('owner_id', id).not('claimed_at', 'is', null).order('claimed_at', { ascending: false }).limit(1).maybeSingle()
  }
  if (result.error) throw new Error('Unable to load this print design.')
  const row = result.data as Row | null
  if (!row) return null
  const card = readPrintableCard(source === 'order' ? row.card_snapshot : source === 'registration' ? row.design_payload : row.payload)
  if (!card) return null
  return { id, source, name: card.configuration.identity.name, material: card.configuration.material, designId: text(row.design_id), email: text(row.email), createdAt: text(row.created_at), label: source === 'order' ? `Order ${row.order_number} · frozen snapshot` : `${accountLabel(row)} · saved design`, accountLinked: Boolean(row.owner_id), configuration: card.configuration, revision: createHash('sha256').update(JSON.stringify(card.configuration)).digest('hex').slice(0, 16), frozen: source === 'order' }
}
