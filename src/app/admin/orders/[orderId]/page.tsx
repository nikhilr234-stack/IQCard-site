import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireVerifiedAdminAccount } from '@/lib/auth/account'
import { parseSavedCardDesign } from '@/lib/dashboard/saved-card'
import { getAdminOrderDetails } from '@/lib/orders/repository'
import { AdminOrderControls } from './controls'
import styles from '../orders.module.css'

export const dynamic = 'force-dynamic'
type PageProps = { params: Promise<{ orderId: string }> }

function formatINR(paise: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(paise / 100)
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  await requireVerifiedAdminAccount()
  const { orderId } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) notFound()
  const details = await getAdminOrderDetails(orderId)
  if (!details) notFound()

  const { order, events } = details
  const card = parseSavedCardDesign({ design_id: order.design_id, payload: order.card_snapshot })
  const address = order.shipping_address
  const addressLines = [address.recipientName, address.line1, address.line2, address.locality, [address.city, address.state, address.postalCode].filter(Boolean).join(', '), 'India'].filter(Boolean)

  return <main className={styles.page}>
    <header className={styles.detailHeader}>
      <div><Link href="/admin/orders" className={styles.back}>← Order queue</Link><p className={styles.eyebrow}>ORDER {order.order_number}</p><h1>{card.available ? `${card.material} IQ Card` : 'Physical IQ Card'}</h1><p>{order.design_id} · Created {order.created_at ? new Date(order.created_at).toLocaleString('en-IN') : '—'}</p></div>
      <div className={styles.detailState}><span className={`${styles.status} ${styles[`status_${order.fulfillment_status}`] ?? ''}`}>{order.fulfillment_status.replaceAll('_', ' ')}</span><span className={`${styles.payment} ${styles[`payment_${order.payment_status}`] ?? ''}`}>{order.payment_status.replaceAll('_', ' ')}</span></div>
    </header>

    <div className={styles.detailGrid}>
      <section className={styles.panel}>
        <h2>Customer and delivery</h2>
        <dl className={styles.detailsList}>
          <div><dt>Customer</dt><dd>{order.email}</dd></div>
          <div><dt>Phone</dt><dd>{order.phone}</dd></div>
          <div><dt>Recipient</dt><dd>{address.recipientName}</dd></div>
          <div><dt>Address</dt><dd>{addressLines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}</dd></div>
        </dl>
        {order.tracking_carrier && order.tracking_number ? <p className={styles.trackingCurrent}>Tracking: <strong>{order.tracking_carrier}</strong> · {order.tracking_number}</p> : null}
      </section>

      <section className={styles.panel}>
        <h2>Card build</h2>
        <dl className={styles.detailsList}>
          <div><dt>Material</dt><dd>{card.available ? card.material : '—'}</dd></div>
          <div><dt>Finish</dt><dd>{card.available ? card.finish : '—'}</dd></div>
          <div><dt>Engraving</dt><dd>{card.available ? card.engravedName || 'None' : '—'}</dd></div>
          <div><dt>NFC back</dt><dd>{card.available ? card.backLayout : '—'}</dd></div>
        </dl>
        <div className={styles.cardSnapshot}>{JSON.stringify(order.card_snapshot, null, 2)}</div>
      </section>

      <section className={styles.panel}>
        <h2>NFC destination</h2>
        {details.profileDestination ? <p>
          {details.profileDestination.status === 'published'
            ? <><Link href={`/${details.profileDestination.slug}`}>/{details.profileDestination.slug}</Link> · published</>
            : <>/{details.profileDestination.slug} · draft. The customer must publish it before production.</>}
        </p> : <p>The customer has not confirmed a published destination yet.</p>}
      </section>

      <section className={styles.panel}>
        <h2>Payment breakdown</h2>
        <dl className={styles.priceList}>
          <div><dt>Card subtotal</dt><dd>{formatINR(order.card_subtotal_paise)}</dd></div>
          <div><dt>Delivery</dt><dd>{formatINR(order.shipping_paise)}</dd></div>
          <div><dt>Tax</dt><dd>{formatINR(order.tax_paise)}</dd></div>
          <div className={styles.total}><dt>Total · {order.currency ?? 'INR'}</dt><dd>{formatINR(order.total_paise)}</dd></div>
          <div><dt>Provider</dt><dd>{order.payment_provider ?? 'Not started'}</dd></div>
          <div><dt>Provider order</dt><dd>{order.gateway_order_id ?? '—'}</dd></div>
        </dl>
      </section>

      <AdminOrderControls orderId={order.id} paymentStatus={order.payment_status} fulfillmentStatus={order.fulfillment_status} profileConfirmed={Boolean(order.profile_id && details.profileDestination?.id === order.profile_id && details.profileDestination?.status === 'published')} trackingCarrier={order.tracking_carrier ?? ''} trackingNumber={order.tracking_number ?? ''} />

      <section className={`${styles.panel} ${styles.history}`}>
        <h2>Order history</h2>
        {events.length ? <ol>{events.map((event) => <li key={event.id}>
          <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('en-IN')}</time>
          <strong>{event.event_type.replaceAll('_', ' ')}</strong>
          <span>{event.source === 'admin' ? `by ${event.actor_email ?? 'admin account'}` : event.source.replaceAll('_', ' ')}</span>
          {event.previous_payment_status !== event.new_payment_status ? <small>Payment: {event.previous_payment_status ?? '—'} → {event.new_payment_status ?? '—'}</small> : null}
          {event.previous_fulfillment_status !== event.new_fulfillment_status ? <small>Fulfillment: {event.previous_fulfillment_status ?? '—'} → {event.new_fulfillment_status ?? '—'}</small> : null}
          {event.previous_tracking_carrier !== event.new_tracking_carrier || event.previous_tracking_number !== event.new_tracking_number ? <small>Tracking: {event.previous_tracking_carrier ?? '—'} {event.previous_tracking_number ?? ''} → {event.new_tracking_carrier ?? '—'} {event.new_tracking_number ?? ''}</small> : null}
        </li>)}</ol> : <p>No order updates recorded yet.</p>}
      </section>
    </div>
  </main>
}
