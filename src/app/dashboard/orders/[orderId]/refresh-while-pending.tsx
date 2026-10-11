'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RefreshWhilePending({ orderId }: { orderId: string }) {
  const router = useRouter()
  useEffect(() => {
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
    return () => { cancelled = true; clearInterval(interval); clearInterval(recovery) }
  }, [router, orderId])
  return null
}
