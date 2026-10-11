import Link from 'next/link'
import styles from './orders.module.css'

export default function AdminOrderNotFound() {
  return <main className={styles.page}>
    <header className={styles.header}><div>
      <p className={styles.eyebrow}>IQ CARD · OPERATIONS</p>
      <h1>Order not found.</h1>
      <p>Check the link or choose an order from the queue.</p>
    </div></header>
    <Link href="/admin/orders" className={styles.back}>← Back to the order queue</Link>
  </main>
}
