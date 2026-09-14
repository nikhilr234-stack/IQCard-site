import Link from 'next/link'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { PublicProfile } from '@/components/public-profile'
import { getOwnProfile, getOwnProfilePresentation } from '@/lib/profile/repository'

export const dynamic = 'force-dynamic'

export default async function PreviewPage() {
  const account = await requireAuthenticatedAccount()
  const profile = await getOwnProfile(account)
  const presentation = await getOwnProfilePresentation(account.id)
  return <main className="preview-shell"><div className="preview-toolbar"><Link href="/dashboard">← Back to editor</Link><span>Private preview · only you can see this</span></div><PublicProfile profile={profile} presentation={presentation} preview /></main>
}
