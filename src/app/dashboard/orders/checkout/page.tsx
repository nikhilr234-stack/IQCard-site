import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getLatestCheckoutHandoff } from '@/lib/checkout/repository'
import { selectExactSavedCardDesign } from '@/lib/dashboard/saved-card'
import { getLatestClaimedRegistrationIntent } from '@/lib/registration/repository'
import { getOrderCheckoutConfig } from '@/lib/orders/checkout-config'
import { getOrderForOwner } from '@/lib/orders/repository'
import { CheckoutForm } from './checkout-form'
import styles from './checkout-shell.module.css'

export const dynamic = 'force-dynamic'

type Props = { searchParams: Promise<{ order?: string | string[] }> }

export default async function PaidCardCheckoutPage({ searchParams }: Props) {
  const query = await searchParams
  const orderId = typeof query.order === 'string' ? query.order : null
  if (query.order !== undefined && (!orderId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId))) notFound()
  const account = await getVerifiedCurrentAccount()
  if (!account) redirect(`/login?next=${encodeURIComponent(`/dashboard/orders/checkout${orderId ? `?order=${orderId}` : ''}`)}`)
  const existing = orderId ? await getOrderForOwner(orderId, account.id) : null
  if (orderId && !existing) notFound()
  if (existing && !['pending', 'failed'].includes(existing.payment_status)) redirect(`/dashboard/orders/${existing.id}`)
  let saved
  if (existing) saved = selectExactSavedCardDesign({ design_id: existing.design_id, payload: existing.card_snapshot })
  else {
    const [registration, handoff] = await Promise.all([
      getLatestClaimedRegistrationIntent(account.id), getLatestCheckoutHandoff(account.id),
    ])
    saved = selectExactSavedCardDesign(
      registration ? { design_id: registration.design_id, payload: registration.design_payload } : null,
      handoff ? { design_id: handoff.design_id, payload: handoff.payload } : null,
    )
  }
  const availability = getOrderCheckoutConfig()

  return <main className={styles.page}>
    <Link href="/dashboard" className={styles.back}>← Your account</Link>
    <p className={styles.eyebrow}>IQ CARD · CHECKOUT</p>
    <h1>Make it yours.<br />We’ll make it real.</h1>
    <p className={styles.intro}>Confirm your delivery details for the card you saved. Your card price is ₹799; delivery and tax are shown separately.</p>
    {saved ? <CheckoutForm key={existing?.id ?? saved.design_id} designId={saved.design_id} payload={saved.payload} initialRequestKey={existing?.client_request_key} checkoutEnabled={availability.ready} shippingPaise={existing?.shipping_paise ?? (availability.ready ? availability.config.shippingPaise : null)} taxPaise={existing?.tax_paise ?? (availability.ready ? availability.config.taxPaise : null)} /> : <section className={styles.empty}><h2>No saved card found</h2><p>Open the card atelier, save a design, and come back here to finish checkout.</p><Link href="/customize">Open card atelier</Link></section>}
  </main>
}
