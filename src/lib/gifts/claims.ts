import { createServerClient } from '@/lib/supabase/server'

export type ClaimableGiftProfile = {
  profileId: string
  slug: string
  recipientName: string
}

export type GiftDiscovery =
  | { status: 'none' }
  | { status: 'claimable'; gift: ClaimableGiftProfile }
  | { status: 'conflict'; gift: ClaimableGiftProfile }

type GiftClaimRow = {
  profile_id?: unknown
  slug?: unknown
  recipient_name?: unknown
  claimable?: unknown
}

function parseGiftRow(value: unknown): ClaimableGiftProfile | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const gift = row as GiftClaimRow
  if (typeof gift.profile_id !== 'string' || typeof gift.slug !== 'string' || typeof gift.recipient_name !== 'string') return null
  return { profileId: gift.profile_id, slug: gift.slug, recipientName: gift.recipient_name }
}

function parseGiftDiscoveryRow(value: unknown): { gift: ClaimableGiftProfile; claimable: boolean } | null {
  const row = Array.isArray(value) ? value[0] : value
  if (!row || typeof row !== 'object') return null
  const giftRow = row as GiftClaimRow
  const gift = parseGiftRow(giftRow)
  if (!gift || typeof giftRow.claimable !== 'boolean') return null
  return { gift, claimable: giftRow.claimable }
}

export async function discoverOwnGiftProfile(): Promise<GiftDiscovery> {
  const { data, error } = await (await createServerClient()).rpc('find_own_unclaimed_gift_profile')
  if (error) throw new Error('Unable to check for a gift profile')
  const discovery = parseGiftDiscoveryRow(data)
  if (!discovery) return { status: 'none' }
  return discovery.claimable ? { status: 'claimable', gift: discovery.gift } : { status: 'conflict', gift: discovery.gift }
}

export async function claimOwnGiftProfile(): Promise<ClaimableGiftProfile> {
  const { data, error } = await (await createServerClient()).rpc('claim_own_gift_profile')
  if (error) {
    if (error.message.includes('existing profile already belongs')) throw new Error('An existing profile already belongs to this account')
    if (error.message.includes('No unclaimed gift')) throw new Error('No unclaimed gift was found for this account')
    if (error.message.includes('verified account email')) throw new Error('A verified account email is required')
    throw new Error('Unable to claim this gift profile')
  }
  const gift = parseGiftRow(data)
  if (!gift) throw new Error('Unable to claim this gift profile')
  return gift
}
