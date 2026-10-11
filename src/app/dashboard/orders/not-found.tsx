import Link from 'next/link'
import styles from './[orderId]/order.module.css'

export default function OrderNotFound() {
  return <main className={styles.page}>
    <header className={styles.header}><div>
      <p className={styles.eyebrow}>IQ CARD · YOUR ORDERS</p>
      <h1>This order isn’t available.</h1>
      <p>Check the link and make sure you’re signed in with the account used to place the order.</p>
    </div></header>
    <Link href="/dashboard/orders" className={styles.back}>← Back to your orders</Link>
  </main>
}
