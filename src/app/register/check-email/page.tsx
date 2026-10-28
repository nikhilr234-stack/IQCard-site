import Link from 'next/link'
import { ResendCountdown } from './resend-countdown'

export default function CheckEmailPage() {
  return <main className="check-email-page">
    <Link href="/" className="check-email-logo" data-iq-brand="primary" aria-label="IQ Card home">iq</Link>
    <section>
      <span className="check-email-mark">✓</span>
      <p>REGISTRATION LINK SENT</p>
      <h1>Check your inbox.</h1>
      <div>We sent a secure, one-time link. Open it to confirm your email and continue with your saved card.</div>
      <aside><strong>You can open the link on any device.</strong><span>It can be used only once. If it expires, request a new link below.</span></aside>
      <ResendCountdown />
      <Link className="check-email-action" href="/customize?restore=1">Return to your saved card</Link>
    </section>
  </main>
}
