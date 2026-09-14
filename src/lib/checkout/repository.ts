import { createAdminClient } from '@/lib/supabase/admin'
import { createHandoffToken, checkoutHandoffExpiryMinutes } from './handoff'

export type CheckoutHandoff = {
  token: string
  email: string
  design_id: string
  payload: Record<string, unknown>
  owner_id: string | null
  created_at: string
  expires_at: string
  claimed_at: string | null
}

export type CreateCheckoutHandoffInput = {
  email: string
  designId: string
  payload: Record<string, unknown>
}

export async function createCheckoutHandoff(input: CreateCheckoutHandoffInput): Promise<{ token: string }> {
  const token = createHandoffToken()
  const expiresAt = new Date(Date.now() + checkoutHandoffExpiryMinutes * 60 * 1000).toISOString()
  const { error } = await createAdminClient().from('checkout_handoffs').insert({
    token,
    email: input.email,
    design_id: input.designId,
    payload: input.payload,
    expires_at: expiresAt,
  })

  if (error) throw new Error('Unable to save your card design')
  return { token }
}

export async function claimCheckoutHandoff(token: string, ownerId: string): Promise<CheckoutHandoff | null> {
  const claimedAt = new Date().toISOString()
  const { data, error } = await createAdminClient()
    .from('checkout_handoffs')
    .update({ owner_id: ownerId, claimed_at: claimedAt })
    .eq('token', token)
    .is('claimed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('*')
    .maybeSingle()

  if (error) throw new Error('Unable to attach your saved card design')
  return data as CheckoutHandoff | null
}

export async function getLatestCheckoutHandoff(ownerId: string): Promise<CheckoutHandoff | null> {
  const { data, error } = await createAdminClient()
    .from('checkout_handoffs')
    .select('*')
    .eq('owner_id', ownerId)
    .not('claimed_at', 'is', null)
    .order('claimed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error('Unable to load your saved card design')
  return data as CheckoutHandoff | null
}
