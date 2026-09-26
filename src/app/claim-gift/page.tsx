import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuthenticatedAccount } from '@/lib/auth/account'
import { claimGiftProfile } from '@/app/actions/gift-claim'
import { discoverOwnGiftProfile } from '@/lib/gifts/claims'

export const dynamic = 'force-dynamic'

export default async function ClaimGiftPage() {
  await requireAuthenticatedAccount()
  const discovery = await discoverOwnGiftProfile()
  if (discovery.status === 'none') redirect('/dashboard')
  const { gift } = discovery
  const conflict = discovery.status === 'conflict'

  return <main className="page" style={{ maxWidth: 620, margin: '10vh auto', padding: 24 }}>
    <p className="eyebrow">A GIFT FOR YOU</p>
    <h1>An IQ has been made for you.</h1>
    <p>{gift.recipientName}, your published profile at <strong>iqcard.in/{gift.slug}</strong> is ready.</p>
    {conflict
      ? <p role="status">This account already has a profile. The gift has been left untouched; contact IQ Card support to resolve the two profiles.</p>
      : <form action={claimGiftProfile}><button className="submit" type="submit">Claim this IQ</button></form>}
    <p><Link href="/">Not now</Link></p>
  </main>
}
