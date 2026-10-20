import { createHash } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { type CanonicalCardConfiguration } from '@/lib/customizer/card-configuration'

import { readPrintableCard } from './design'

export type PrintSource = 'order' | 'registration' | 'handoff'
export type PrintDesignSummary = { id: string; source: PrintSource; designId: string; email: string; createdAt: string; label: string }
export type PrintDesign = PrintDesignSummary & { configuration: CanonicalCardConfiguration; revision: string; frozen: boolean }
export function validPrintLookup(source: unknown, id: unknown): source is PrintSource {
  return ['order', 'registration', 'handoff'].includes(String(source)) && typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
// Handoff lookup uses owner UUID, never the private email-claim token.
export async function listPrintDesigns(): Promise<PrintDesignSummary[]> {
  const db=createAdminClient()
  const results=await Promise.all([
    db.from('paid_orders').select('id,design_id,email,created_at,order_number').order('created_at',{ascending:false}).limit(100),
    db.from('registration_intents').select('id,design_id,email,created_at').eq('status','claimed').not('owner_id','is',null).order('created_at',{ascending:false}).limit(100),
    db.from('checkout_handoffs').select('owner_id,design_id,email,created_at').not('claimed_at','is',null).not('owner_id','is',null).order('claimed_at',{ascending:false}).limit(100),
  ])
  if(results.some(r=>r.error))throw new Error('Unable to load print designs.')
  const [orders,registrations,handoffs]=results
  const seen=new Set<string>()
  return [
    ...(orders.data??[]).map(row=>({id:row.id,source:'order' as const,designId:row.design_id,email:row.email,createdAt:row.created_at,label:`Order ${row.order_number} · frozen snapshot`})),
    ...(registrations.data??[]).map(row=>({id:row.id,source:'registration' as const,designId:row.design_id,email:row.email,createdAt:row.created_at,label:'Saved registration design'})),
    ...(handoffs.data??[]).filter(row=>{if(seen.has(row.owner_id))return false;seen.add(row.owner_id);return true}).map(row=>({id:row.owner_id,source:'handoff' as const,designId:row.design_id,email:row.email,createdAt:row.created_at,label:'Latest legacy saved design'})),
  ]
}
export async function getPrintDesign(source: PrintSource,id: string): Promise<PrintDesign|null> {
  if(!validPrintLookup(source,id))return null
  const db=createAdminClient()
  let result
  if(source==='order') result=await db.from('paid_orders').select('id,design_id,email,created_at,order_number,card_snapshot').eq('id',id).maybeSingle()
  else if(source==='registration')result=await db.from('registration_intents').select('id,design_id,email,created_at,design_payload').eq('id',id).eq('status','claimed').not('owner_id','is',null).maybeSingle()
  else result=await db.from('checkout_handoffs').select('owner_id,design_id,email,created_at,payload').eq('owner_id',id).not('claimed_at','is',null).order('claimed_at',{ascending:false}).limit(1).maybeSingle()
  if(result.error)throw new Error('Unable to load this print design.')
  const row=result.data as Record<string,unknown>|null
  if(!row)return null
  const card=readPrintableCard(source==='order'?row.card_snapshot:source==='registration'?row.design_payload:row.payload)
  if(!card)return null
  return {id,source,designId:String(row.design_id),email:String(row.email),createdAt:String(row.created_at),label:source==='order'?`Order ${row.order_number} · frozen snapshot`:source==='registration'?'Saved registration design':'Latest legacy saved design',configuration:card.configuration,revision:createHash('sha256').update(JSON.stringify(card.configuration)).digest('hex').slice(0,16),frozen:source==='order'}
}
