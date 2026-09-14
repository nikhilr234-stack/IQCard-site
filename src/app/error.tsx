'use client'

import Link from 'next/link'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="message-shell"><span className="eyebrow">IQ CARD</span><h1>Something went wrong.</h1><p>We couldn’t load this page. Try again, or head back home.</p><div className="message-actions"><button className="primary-button" onClick={() => reset()}>Try again</button><Link className="secondary-button" href="/">Back home</Link></div></main>
}
