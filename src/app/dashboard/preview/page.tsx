import Link from 'next/link'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { getOwnProfile } from '@/lib/profile/repository'
import { PublicProfileCard } from '@/components/public-profile-card'

export const dynamic = 'force-dynamic'

export default async function PreviewPage() {
  const account = await requireAuthenticatedAccount()
  const profile = await getOwnProfile(account)
  return <main className="preview-shell"><div className="preview-toolbar"><Link href="/dashboard">← Back to editor</Link><span>Private preview · only you can see this</span></div><PublicProfileCard profile={profile} preview /></main>
}
