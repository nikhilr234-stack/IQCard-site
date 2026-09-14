import Link from 'next/link'

export default function NotFound() {
  return <main className="message-shell"><span className="eyebrow">404</span><h1>That card isn’t here.</h1><p>The profile may still be a draft, or the link may have changed.</p><Link className="primary-button" href="/">Back home</Link></main>
}
