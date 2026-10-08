'use client'

import { useState } from 'react'
import styles from './order.module.css'

export function ConfirmProfile({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function confirm() {
    setBusy(true)
    setMessage('Checking your published profile…')
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/profile`, { method: 'POST' })
      const result = await response.json() as { ok?: boolean; profileSlug?: string; message?: string }
      if (!response.ok || !result.ok) throw new Error(result.message || 'Your published profile is not ready yet.')
      setMessage(`NFC destination confirmed: /${result.profileSlug}. The operations team can now start production.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not confirm your profile. Please try again.')
    } finally { setBusy(false) }
  }
  return <div className={styles.confirmBlock}><button type="button" onClick={() => void confirm()} disabled={busy}>{busy ? 'Checking…' : 'Confirm my published profile'}</button>{message ? <p role="status">{message}</p> : null}</div>
}
