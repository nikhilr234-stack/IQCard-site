'use client'

import Script from 'next/script'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { parseSavedCardDesign } from '@/lib/dashboard/saved-card'
import styles from './orders.module.css'

type Address = { recipientName: string; line1: string; line2: string; locality: string; city: string; state: string; postalCode: string; country: 'IN' }
type CheckoutReply = {
  ok?: boolean; message?: string; code?: string
  order?: { id: string; number: string; phone: string; shippingAddress: Address; paymentStatus: string; totalPaise: number; cardSubtotalPaise: number; shippingPaise: number; taxPaise: number; cardSnapshot?: Record<string, unknown> }
  payment?: { keyId: string; orderId: string; amountPaise: number; currency: 'INR' }
}
type RazorpayWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => { open(): void } }

const emptyAddress: Address = { recipientName: '', line1: '', line2: '', locality: '', city: '', state: '', postalCode: '', country: 'IN' }
const paise = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value / 100)

export function CheckoutForm({ designId, payload, checkoutEnabled, shippingPaise, taxPaise, initialRequestKey }: { designId: string; payload: Record<string, unknown>; checkoutEnabled: boolean; shippingPaise: number | null; taxPaise: number | null; initialRequestKey?: string }) {
  const router = useRouter()
  const [requestKey, setRequestKey] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState<Address>(emptyAddress)
  const [order, setOrder] = useState<CheckoutReply['order']>()
  const [paymentSession, setPaymentSession] = useState<CheckoutReply['payment']>()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const card = useMemo(() => parseSavedCardDesign({ design_id: designId, payload: order?.cardSnapshot ?? payload }), [designId, order?.cardSnapshot, payload])

  useEffect(() => {
    const keyName = `iqcard:order-request:${designId}`
    let storedKey: string | null = null
    try { storedKey = sessionStorage.getItem(keyName) } catch {}
    const key = initialRequestKey ?? (storedKey && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storedKey) ? storedKey : crypto.randomUUID())
    try { sessionStorage.setItem(keyName, key) } catch {}
    queueMicrotask(() => setRequestKey(key))
    void fetch(`/api/orders?requestKey=${encodeURIComponent(key)}`, { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return
      const result = await response.json() as { order?: CheckoutReply['order']; payment?: CheckoutReply['payment'] }
      if (result.order) {
        setOrder(result.order)
        if (result.payment) setPaymentSession(result.payment)
        setPhone(result.order.phone)
        setAddress({ ...emptyAddress, ...result.order.shippingAddress })
      }
    }).catch(() => undefined)
  }, [designId, initialRequestKey])

  function updateAddress(field: keyof Address, value: string) {
    setAddress((current) => ({ ...current, [field]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!requestKey || busy) return
    setBusy(true)
    setMessage('Saving your order details…')
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ requestKey, designId, phone, shippingAddress: address }),
      })
      const result = await response.json() as CheckoutReply
      if (!response.ok || !result.ok || !result.order || !result.payment) throw new Error(result.message || 'Checkout could not start. Your saved card is safe to retry.')
      setOrder(result.order)
      setPaymentSession(result.payment)
      setMessage('Your order details are saved. Review the full total, then continue to payment.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Checkout could not start. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function startPayment() {
    if (!order || !paymentSession || busy) return
    const Razorpay = (window as RazorpayWindow).Razorpay
    if (!Razorpay) { setMessage('The payment window is still loading. Wait a moment and try again.'); return }
    const payment = new Razorpay({
      key: paymentSession.keyId,
      amount: paymentSession.amountPaise,
      currency: paymentSession.currency,
      name: 'IQ Card',
      description: `Order ${order.number}`,
      order_id: paymentSession.orderId,
      prefill: { contact: order.phone },
      notes: { order_number: order.number },
      theme: { color: '#171717' },
      handler: () => { router.push(`/dashboard/orders/${encodeURIComponent(order.id)}?payment=processing`) },
      modal: { ondismiss: () => setMessage('Payment window closed. Your order details are saved; you can try again here.') },
    })
    setMessage('')
    payment.open()
  }

  if (!card.available) return <section className={styles.checkoutPanel}><h2>Saved card unavailable</h2><p>Reopen the card atelier and save your design again before checkout.</p></section>

  const displayedOrder = order
  return <div className={styles.checkoutLayout}>
    {checkoutEnabled ? <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" /> : null}
    <form className={styles.checkoutPanel} onSubmit={submit}>
      <div><p className={styles.panelKicker}>DELIVERY DETAILS</p><h2>Where should we send it?</h2></div>
      <fieldset disabled={Boolean(order)} className={styles.fieldsLocked}>
      <label>Recipient name<input required maxLength={120} autoComplete="name" value={address.recipientName} onChange={(event) => updateAddress('recipientName', event.target.value)} /></label>
      <label>Address line 1<input required maxLength={180} autoComplete="address-line1" value={address.line1} onChange={(event) => updateAddress('line1', event.target.value)} /></label>
      <label>Address line 2 <span>(optional)</span><input maxLength={180} autoComplete="address-line2" value={address.line2} onChange={(event) => updateAddress('line2', event.target.value)} /></label>
      <label>Area / locality<input required maxLength={120} autoComplete="address-level3" value={address.locality} onChange={(event) => updateAddress('locality', event.target.value)} /></label>
      <div className={styles.twoFields}>
        <label>City<input required maxLength={120} autoComplete="address-level2" value={address.city} onChange={(event) => updateAddress('city', event.target.value)} /></label>
        <label>State<input required maxLength={120} autoComplete="address-level1" value={address.state} onChange={(event) => updateAddress('state', event.target.value)} /></label>
      </div>
      <div className={styles.twoFields}>
        <label>PIN code<input required inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" value={address.postalCode} onChange={(event) => updateAddress('postalCode', event.target.value)} /></label>
        <label>Mobile number<input required type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit Indian number" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      </div>
      </fieldset>
      {order ? <p className={styles.savedAddressNote}>These delivery details are saved with your order. Contact support if they need to change.</p> : null}
      <p className={styles.countryNote}>Delivery is available to India addresses for this launch.</p>
      {!checkoutEnabled ? <p className={styles.disabledNote}>Checkout is not enabled yet. Your saved card is safe. Delivery details are saved when checkout is enabled and you submit them.</p> : null}
      {!displayedOrder || !paymentSession ? <button className={styles.payButton} disabled={!checkoutEnabled || busy || !requestKey || Boolean(displayedOrder && !['pending', 'failed'].includes(displayedOrder.paymentStatus))}>{busy ? 'Preparing checkout…' : displayedOrder?.paymentStatus === 'failed' ? 'Resume payment' : displayedOrder ? 'Resume checkout' : 'Save details and review total'}</button> : <button type="button" className={styles.payButton} disabled={!checkoutEnabled || busy} onClick={startPayment}>Pay {paise(paymentSession.amountPaise)} securely</button>}
      {displayedOrder && !['pending', 'failed'].includes(displayedOrder.paymentStatus) ? <Link href={`/dashboard/orders/${encodeURIComponent(displayedOrder.id)}`} className={styles.orderLink}>View order status</Link> : null}
      {message ? <p className={styles.formMessage} role="status">{message}</p> : null}
    </form>
    <aside className={styles.summaryPanel}>
      <p className={styles.panelKicker}>YOUR SAVED CARD</p>
      <h2>{card.material} IQ Card</h2>
      <p>{card.engravedName}</p>
      <p>{card.finish} finish · {card.backLayout} back</p>
      <div className={styles.priceRows}><span>Card</span><strong>{paise(displayedOrder?.cardSubtotalPaise ?? 79_900)}</strong><span>Delivery</span><strong>{displayedOrder ? paise(displayedOrder.shippingPaise) : shippingPaise === null ? 'Shown before payment' : paise(shippingPaise)}</strong><span>Tax</span><strong>{displayedOrder ? paise(displayedOrder.taxPaise) : taxPaise === null ? 'Shown before payment' : paise(taxPaise)}</strong></div>
      {displayedOrder ? <div className={styles.totalRow}><span>Total</span><strong>{paise(displayedOrder.totalPaise)}</strong></div> : shippingPaise !== null && taxPaise !== null ? <div className={styles.totalRow}><span>Estimated total</span><strong>{paise(79_900 + shippingPaise + taxPaise)}</strong></div> : <p className={styles.priceNote}>Delivery and tax will be shown before checkout is enabled.</p>}
      <p className={styles.orderSaveNote}>{order ? 'Your order details are saved to your account so you can safely resume checkout.' : 'Review your delivery details before saving them with your order.'}</p>
    </aside>
  </div>
}
