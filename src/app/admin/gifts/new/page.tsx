import Link from 'next/link'
import { requireAdminAccount } from '@/lib/auth/account'
import { GiftCreateForm } from '@/features/admin/gifts/GiftCreateForm'

export const dynamic = 'force-dynamic'

export default async function NewGiftPage() {
  await requireAdminAccount()
  return <main className="gift-page"><Link href="/admin">← Admin</Link><h1>Create a gift profile</h1><p>Publish a personal profile in seconds. The recipient can claim it later.</p><GiftCreateForm /></main>
}
