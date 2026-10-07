import Link from 'next/link'
import { requireVerifiedAdminAccount } from '@/lib/auth/account'
import { parseSavedCardDesign } from '@/lib/dashboard/saved-card'
import { listAdminOrders } from '@/lib/orders/repository'
import styles from './orders.module.css'

export const dynamic = 'force-dynamic'

type PageProps = { searchParams: Promise<{ status?: string }> }
const filters = ['all', 'paid', 'awaiting_profile', 'in_production', 'shipped', 'delivered', 'cancelled'] as const

function formatINR(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100)
}

function statusLabel(value: string) {
  return value.replaceAll('_', ' ')
}

function addressSummary(address: Readonly<Record<string, string>>) {
  return [address.city, address.state, address.postalCode].filter(Boolean).join(', ')
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireVerifiedAdminAccount()
  const params = await searchParams
  const activeFilter = filters.includes(params.status as typeof filters[number]) ? params.status as typeof filters[number] : 'all'
  const orders = await listAdminOrders()
  const filtered = activeFilter === 'all'
    ? orders
    : activeFilter === 'paid'
      ? orders.filter((order) => order.payment_status === 'paid')
      : orders.filter((order) => order.fulfillment_status === activeFilter)

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><Link href="/admin" className={styles.back}>← Admin dashboard</Link><p className={styles.eyebrow}>OPERATIONS</p><h1>Order queue</h1><p>Track paid cards from profile confirmation through delivery.</p></div>
      <span className={styles.queueCount}>{filtered.length} <small>orders</small></span>
    </header>

    <nav className={styles.filters} aria-label="Filter orders">
      {filters.map((filter) => <Link key={filter} href={filter === 'all' ? '/admin/orders' : `/admin/orders?status=${filter}`} aria-current={filter === activeFilter ? 'page' : undefined}>
        {filter === 'all' ? 'All orders' : statusLabel(filter)}
      </Link>)}
    </nav>

    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Order</th><th>Customer</th><th>Card</th><th>NFC destination</th><th>Fulfillment</th><th>Payment</th><th>Ship to</th><th>Total</th><th></th></tr></thead>
        <tbody>
          {filtered.map((order) => {
            const card = parseSavedCardDesign({ design_id: order.design_id, payload: order.card_snapshot })
            return <tr key={order.id}>
              <td><strong>{order.order_number}</strong><small>{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN') : '—'}</small></td>
              <td>{order.email}<small>{order.phone}</small></td>
              <td><strong>{card.available ? `${card.material} · ${card.finish}` : 'Saved design'}</strong><small>{order.design_id}</small></td>
              <td>{order.profileDestination?.status === 'published' ? <Link href={`/${order.profileDestination.slug}`}>/{order.profileDestination.slug}</Link> : order.profileDestination ? <>{order.profileDestination.slug}<small>Needs publishing</small></> : <span>Needs confirmation</span>}</td>
              <td><span className={`${styles.status} ${styles[`status_${order.fulfillment_status}`] ?? ''}`}>{statusLabel(order.fulfillment_status)}</span></td>
              <td><span className={`${styles.payment} ${styles[`payment_${order.payment_status}`] ?? ''}`}>{statusLabel(order.payment_status)}</span></td>
              <td>{addressSummary(order.shipping_address)}<small>{order.shipping_address.country === 'IN' ? 'India' : order.shipping_address.country}</small></td>
              <td><strong>{formatINR(order.total_paise)}</strong><small>{order.currency ?? 'INR'}</small></td>
              <td><Link className={styles.openLink} href={`/admin/orders/${order.id}`}>Open<span aria-hidden="true">↗</span></Link></td>
            </tr>
          })}
          {filtered.length === 0 ? <tr><td className={styles.empty} colSpan={9}>No orders match this filter yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
    <p className={styles.footerNote}>Showing the latest {orders.length} orders. Payment states come from verified provider notifications; fulfillment updates are recorded with the admin account.</p>
  </main>
}
