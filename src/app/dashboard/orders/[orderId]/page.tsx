import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { getOrderForOwner, getOwnProfileDestination } from '@/lib/orders/repository'
import { ConfirmProfile } from './confirm-profile'
import { RefreshWhilePending } from './refresh-while-pending'
import styles from './order.module.css'

export const dynamic = 'force-dynamic'
type Props = { params: Promise<{ orderId: string }> }
const formatINR = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100)

export default async function CustomerOrderPage({ params }: Props) {
  const account = await getVerifiedCurrentAccount()
  if (!account) redirect('/login?next=%2Fdashboard%2Forders')
  const { orderId } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) notFound()
  const order = await getOrderForOwner(orderId, account.id)
  if (!order) notFound()
  const profile = await getOwnProfileDestination(account.id)
  const confirmed = Boolean(order.profile_id && profile?.id === order.profile_id && profile.status === 'published')
  const address = order.shipping_address
  return <main className={styles.page}>
    <Link href="/dashboard" className={styles.back}>← Your account</Link>
    <header className={styles.header}><div><p className={styles.eyebrow}>IQ CARD · ORDER {order.order_number}</p><h1>{order.payment_status === 'paid' ? 'Your card is in motion.' : 'Your order is saved.'}</h1><p>Open or refresh this page to see the latest status as your order moves through production and delivery.</p></div><span className={styles.status}>{order.fulfillment_status.replaceAll('_', ' ')}</span></header>
    {order.payment_status === 'pending' ? <><RefreshWhilePending /><p className={styles.pending} role="status">We’re waiting for Razorpay to confirm payment. This page refreshes automatically while we wait.</p></> : null}
    <div className={styles.grid}>
      <section className={styles.panel}><h2>Payment</h2><dl><div><dt>Status</dt><dd>{order.payment_status.replaceAll('_', ' ')}</dd></div><div><dt>Card</dt><dd>{formatINR(order.card_subtotal_paise)}</dd></div><div><dt>Delivery</dt><dd>{formatINR(order.shipping_paise)}</dd></div><div><dt>Tax</dt><dd>{formatINR(order.tax_paise)}</dd></div><div><dt>Total</dt><dd>{formatINR(order.total_paise)}</dd></div></dl></section>
      <section className={styles.panel}><h2>Delivery details</h2><p>{address.recipientName}<br />{address.line1}{address.line2 ? <><br />{address.line2}</> : null}<br />{address.locality}<br />{address.city}, {address.state} {address.postalCode}<br />India</p><p>{order.phone}</p>{order.tracking_carrier && order.tracking_number ? <p>Tracking: <strong>{order.tracking_carrier}</strong> · {order.tracking_number}</p> : null}</section>
      {order.payment_status === 'paid' ? <section className={styles.panel}><h2>NFC destination</h2>{confirmed ? <p>Your published profile <strong>/{profile?.slug}</strong> is confirmed for this card.</p> : <><p>Publish your digital profile, then confirm it here. Production starts only after this step.</p><Link href="/dashboard/digital-profile">Review your digital profile</Link><ConfirmProfile orderId={order.id} /></>}</section> : null}
    </div>
  </main>
}
