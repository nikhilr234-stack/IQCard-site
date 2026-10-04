'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

export function ResendCountdown() {
  const [seconds, setSeconds] = useState(60)
  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [seconds])

  return seconds > 0
    ? <p className="check-email-resend" aria-live="polite">You can request another link in {seconds} seconds.</p>
    : <Link className="check-email-action secondary" href="/customize?restore=1">Request another link</Link>
}
