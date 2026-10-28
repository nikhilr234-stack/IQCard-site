import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getVerifiedCurrentAccount } from '@/lib/auth/account'
import { listOrdersForOwner } from '@/lib/orders/repository'
import styles from './[orderId]/order.module.css'

export const dynamic = 'force-dynamic'
const formatINR = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100)

export default async function CustomerOrdersPage() {
  const account = await getVerifiedCurrentAccount()
  if (!account) redirect('/login?next=%2Fdashboard%2Forders')
  const orders = await listOrdersForOwner(account.id)

  return <main className={styles.page}>
    <Link href="/dashboard" className={styles.back}>← Your account</Link>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>IQ CARD · YOUR ORDERS</p><h1>Your cards, in motion.</h1><p>Review payment, production and delivery for your saved orders.</p></div>
      <Link href="/dashboard/orders/checkout">Order your saved card →</Link>
    </header>
    {orders.length ? <div className={styles.grid}>{orders.map(order => <article key={order.id} className={styles.panel}>
      <h2>{order.order_number}</h2>
      <p>Design {order.design_id}</p>
      <dl><div><dt>Payment</dt><dd>{order.payment_status.replaceAll('_', ' ')}</dd></div><div><dt>Delivery</dt><dd>{order.fulfillment_status.replaceAll('_', ' ')}</dd></div><div><dt>Total</dt><dd>{formatINR(order.total_paise)}</dd></div></dl>
      <p><Link href={`/dashboard/orders/${encodeURIComponent(order.id)}`}>View order →</Link></p>
    </article>)}</div> : <section className={styles.panel}><h2>No orders yet</h2><p>Your saved card design is ready to review from checkout. An order appears here after its details are submitted.</p></section>}
  </main>
}
