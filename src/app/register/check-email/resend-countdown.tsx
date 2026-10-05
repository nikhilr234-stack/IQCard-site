'use client'

import { useEffect, useState } from 'react'

export function ResendCountdown() {
  const [seconds, setSeconds] = useState(60)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  async function resend() {
    if (sending) return
    let registration: { email: string; designId: string } | null = null
    try {
      const value = sessionStorage.getItem('iq-registration-resend')
      const parsed = value ? JSON.parse(value) as { email?: unknown; designId?: unknown } : null
      if (typeof parsed?.email === 'string' && typeof parsed.designId === 'string') registration = { email: parsed.email, designId: parsed.designId }
    } catch { registration = null }
    if (!registration) {
      setMessage('This browser no longer has the saved email request. Return to your saved card and request a new link.')
      return
    }
    setSending(true)
    setMessage('Sending a fresh link…')
    try {
      const response = await fetch('/api/registration/resend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(registration) })
      const result = await response.json()
      if (!response.ok || !result.ok) throw new Error(result.error || 'We could not send the link. Please try again.')
      setSeconds(60)
      setMessage(`A fresh link was sent to ${registration.email}. Your saved card is unchanged.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'We could not send the link. Please try again.')
    } finally { setSending(false) }
  }

  return <div>
    {seconds > 0
      ? <p className="check-email-resend" aria-live="polite">You can request another link in {seconds} seconds.</p>
      : <button type="button" className="check-email-action secondary" disabled={sending} onClick={() => void resend()}>{sending ? 'Sending…' : 'Resend secure link'}</button>}
    {message ? <p className="check-email-resend" role="status" aria-live="polite">{message}</p> : null}
  </div>
}
