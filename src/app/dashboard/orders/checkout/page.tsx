import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getLatestCheckoutHandoff } from '@/lib/checkout/repository'
import { selectExactSavedCardDesign } from '@/lib/dashboard/saved-card'
import { getLatestClaimedRegistrationIntent } from '@/lib/registration/repository'
import { getOrderCheckoutConfig } from '@/lib/orders/checkout-config'
import { CheckoutForm } from './checkout-form'
import styles from './checkout-shell.module.css'

export const dynamic = 'force-dynamic'

export default async function PaidCardCheckoutPage() {
  const account = await getVerifiedCurrentAccount()
  if (!account) redirect('/login?next=%2Fdashboard%2Forders%2Fcheckout')
  const [registration, handoff] = await Promise.all([
    getLatestClaimedRegistrationIntent(account.id),
    getLatestCheckoutHandoff(account.id),
  ])
  const saved = selectExactSavedCardDesign(
    registration ? { design_id: registration.design_id, payload: registration.design_payload } : null,
    handoff ? { design_id: handoff.design_id, payload: handoff.payload } : null,
  )
  const availability = getOrderCheckoutConfig()

  return <main className={styles.page}>
    <Link href="/dashboard" className={styles.back}>← Your account</Link>
    <p className={styles.eyebrow}>IQ CARD · CHECKOUT</p>
    <h1>Make it yours.<br />We’ll make it real.</h1>
    <p className={styles.intro}>Confirm your delivery details for the card you saved. Your card price is ₹799; delivery and tax are shown separately.</p>
    {saved ? <CheckoutForm designId={saved.design_id} payload={saved.payload} checkoutEnabled={availability.ready} shippingPaise={availability.ready ? availability.config.shippingPaise : null} taxPaise={availability.ready ? availability.config.taxPaise : null} /> : <section className={styles.empty}><h2>No saved card found</h2><p>Open the card atelier, save a design, and come back here to finish checkout.</p><Link href="/customize">Open card atelier</Link></section>}
  </main>
}
