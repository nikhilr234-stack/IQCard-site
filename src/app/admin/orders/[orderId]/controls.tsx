'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import styles from '../orders.module.css'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refund_pending' | 'refunded'
type FulfillmentStatus = 'unfulfilled' | 'awaiting_profile' | 'in_production' | 'shipped' | 'delivered' | 'cancelled'

export function AdminOrderControls({
  orderId,
  paymentStatus,
  fulfillmentStatus,
  profileConfirmed,
  trackingCarrier,
  trackingNumber,
}: {
  orderId: string
  paymentStatus: PaymentStatus
  fulfillmentStatus: FulfillmentStatus
  profileConfirmed: boolean
  trackingCarrier: string
  trackingNumber: string
}) {
  const router = useRouter()
  const [nextStatus, setNextStatus] = useState<FulfillmentStatus | ''>('')
  const [carrier, setCarrier] = useState(trackingCarrier)
  const [tracking, setTracking] = useState(trackingNumber)
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function update(body: Record<string, string>) {
    setPending(true)
    setError('')
    setNotice('Saving order update…')
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json() as { ok?: unknown; message?: unknown; outcome?: unknown }
      if (!response.ok || result.ok !== true) throw new Error(typeof result.message === 'string' ? result.message : 'This order update could not be saved.')
      setNotice(result.outcome === 'unchanged' ? 'No change was needed.' : 'Order update saved in its history.')
      setNextStatus('')
      router.refresh()
    } catch (updateError) {
      setNotice('')
      setError(updateError instanceof Error ? updateError.message : 'This order update could not be saved.')
    } finally {
      setPending(false)
    }
  }

  function submitFulfillment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!nextStatus) return
    void update({
      fulfillmentStatus: nextStatus,
      ...(nextStatus === 'shipped' ? { trackingCarrier: carrier, trackingNumber: tracking } : {}),
    })
  }

  function startRefund() { void update({ paymentStatus: 'refund_pending' }) }
  function finishRefund() { void update({ paymentStatus: 'refunded' }) }

  const canManageFulfillment = ['paid', 'refund_pending', 'refunded'].includes(paymentStatus)
  const canStartProduction = paymentStatus === 'paid' && profileConfirmed
  const availableStatuses: FulfillmentStatus[] = fulfillmentStatus === 'awaiting_profile'
    ? canStartProduction ? ['in_production', 'cancelled'] : ['cancelled']
    : fulfillmentStatus === 'in_production'
      ? paymentStatus === 'refunded' ? ['cancelled'] : ['shipped', 'cancelled']
      : fulfillmentStatus === 'shipped'
        ? ['delivered', 'cancelled']
        : []

  return <section className={styles.panel} aria-labelledby="fulfillment-controls-title">
    <h2 id="fulfillment-controls-title">Fulfillment actions</h2>
    {paymentStatus === 'paid' && fulfillmentStatus === 'awaiting_profile' && !profileConfirmed ? <p className={styles.controlNote}>Wait for the customer to publish and confirm the NFC destination before production.</p> : null}
    {paymentStatus !== 'paid' && canManageFulfillment && fulfillmentStatus === 'awaiting_profile' ? <p className={styles.controlNote}>Production cannot start after a refund has been requested. Record cancellation if the order will not proceed.</p> : null}
    {paymentStatus === 'refund_pending' && ['in_production', 'shipped'].includes(fulfillmentStatus) ? <p className={styles.controlNote}>Refund status is separate from shipment and delivery tracking.</p> : null}
    {canManageFulfillment && availableStatuses.length ? <form className={styles.updateForm} onSubmit={submitFulfillment}>
      <label>Update status<select value={nextStatus} required onChange={(event) => setNextStatus(event.target.value as FulfillmentStatus | '')}>
        <option value="">Choose status</option>
        {availableStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
      </select></label>
      {nextStatus === 'shipped' ? <div className={styles.trackingFields}>
        <label>Carrier<input required maxLength={80} value={carrier} onChange={(event) => setCarrier(event.target.value)} placeholder="Carrier name" /></label>
        <label>Tracking number<input required maxLength={120} value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Tracking number" /></label>
      </div> : null}
      <button type="submit" disabled={pending || !nextStatus}>{pending ? 'Saving…' : 'Save fulfillment update'}</button>
    </form> : <p className={styles.controlNote}>{canManageFulfillment ? 'There are no further fulfillment changes available.' : 'Fulfillment actions appear after payment is confirmed.'}</p>}

    {paymentStatus === 'paid' ? <div className={styles.refundPanel}>
      <p>Refund updates only record the outcome here; process the refund with the payment provider separately.</p>
      <button type="button" className={styles.secondaryButton} disabled={pending} onClick={startRefund}>Record refund requested</button>
    </div> : null}
    {paymentStatus === 'refund_pending' ? <div className={styles.refundPanel}>
      <p>After the payment provider confirms the refund, record it here.</p>
      <button type="button" className={styles.secondaryButton} disabled={pending} onClick={finishRefund}>Record refund completed</button>
    </div> : null}
    {paymentStatus === 'refunded' ? <p className={styles.controlNote}>{fulfillmentStatus === 'shipped'
      ? 'Refund completed. Continue tracking delivery already in transit.'
      : fulfillmentStatus === 'delivered'
        ? 'Refund completed. Delivery is already recorded.'
        : fulfillmentStatus === 'cancelled'
          ? 'Refund completed. This order is cancelled.'
          : 'A completed refund means an unshipped order must be cancelled.'}</p> : null}
    {!canManageFulfillment && paymentStatus !== 'paid' && paymentStatus !== 'refund_pending' ? <p className={styles.controlNote}>Refund and fulfillment actions are unavailable until payment is confirmed.</p> : null}
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {notice ? <p role="status" className={styles.notice}>{notice}</p> : null}
  </section>
}
