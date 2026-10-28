'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshWhilePending({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [delayed, setDelayed] = useState(false)
  useEffect(() => {
    if (delayed) return
    let cancelled = false
    let inFlight = false
    const reconcile = async () => {
      if (inFlight || cancelled) return
      inFlight = true
      try {
        const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/reconcile`, { method: 'POST', cache: 'no-store' })
        if (response.ok && !cancelled) router.refresh()
      } catch { /* Keep the saved order visible; the next bounded check can retry. */ }
      finally { inFlight = false }
    }
    void reconcile()
    const recovery = setInterval(() => { void reconcile() }, 30_000)
    const interval = setInterval(() => router.refresh(), 5_000)
    const timeout = setTimeout(() => { cancelled = true; clearInterval(interval); clearInterval(recovery); setDelayed(true) }, 120_000)
    return () => { clearTimeout(timeout); cancelled = true; clearInterval(interval); clearInterval(recovery) }
  }, [router, orderId, delayed])
  return delayed ? <div role="status"><p>Payment confirmation is taking longer than usual. Do not pay again while confirmation is pending. Keep this order number for any enquiry.</p><button type="button" onClick={async () => { try { await fetch(`/api/orders/${encodeURIComponent(orderId)}/reconcile`, { method: 'POST', cache: 'no-store' }) } catch {} finally { router.refresh() } }}>Check payment status</button></div> : null
}
