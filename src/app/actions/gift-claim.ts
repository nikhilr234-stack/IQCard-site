'use server'

import { redirect } from 'next/navigation'
import { claimOwnGiftProfile } from '@/lib/gifts/claims'
import { requireAuthenticatedAccount } from '@/lib/auth/account'

export async function claimGiftProfile() {
  await requireAuthenticatedAccount()
  await claimOwnGiftProfile()
  redirect('/dashboard')
}
