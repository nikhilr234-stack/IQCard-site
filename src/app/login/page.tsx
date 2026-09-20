import Link from 'next/link'
import { requestMagicLink } from '@/app/actions/auth'
import { getLoginPageState } from '@/lib/auth/login-page-content'
import { magicLinkErrorMessage } from '@/lib/auth/messages'
import { loginStyles } from '@/components/login-styles'
import { getCurrentAccount } from '@/lib/auth/account'
import { redirect } from 'next/navigation'

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string; sent?: string }>
}

const pageStyles = `${loginStyles}\nmain.page { width: 100%; max-width: none; margin: 0; padding: 72px 0 0; }`
export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const account = await getCurrentAccount()
  if (account?.role === 'admin') redirect('/admin')
  if (account?.role === 'client') redirect('/dashboard')
  const state = getLoginPageState(params)
  const errorMessage = state.error ? magicLinkErrorMessage(state.error) : null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <header className="nav">
        <Link className="brand" data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</Link>
        <Link className="back" href="/"><span aria-hidden="true">←</span> Back to IQ</Link>
      </header>

      <main className="page">
        <section className="auth" aria-labelledby="login-title">
          <div className="auth-inner">
            <p className="eyebrow">WELCOME TO IQ</p>
            <h1 id="login-title">Your introduction,<br />starts here.</h1>
            <p className="lead">Create or continue your IQ identity. We’ll send you a secure link to continue — no password required.</p>

            <div className="mobile-card" aria-hidden="true">
              <div className="card-wrap">
                <div className="card">
                  <div className="card-content">
                    <span className="card-mark">iq</span>
                    <span className="card-micro">NFC / IQ 01</span>
                    <strong className="card-name">YOUR NAME</strong>
                  </div>
                </div>
                <div className="edge" />
              </div>
            </div>

            {state.sent ? (
              <section className="success" aria-live="polite">
                <div className="success-mark" aria-hidden="true">✓</div>
                <h2>Check your inbox.</h2>
                <p>We sent a secure sign-in link to your email address.</p>
                <div className="success-actions">
                  <Link className="text-action" href="/login">Send another link</Link>
                  {state.next ? <Link className="text-action secondary" href={state.next}>Continue</Link> : null}
                </div>
              </section>
            ) : (
              <div className="form-wrap">
                <div className="form-shell">
                  <form action={requestMagicLink}>
                    <input type="hidden" name="next" value={state.next} />
                    <label className="field-label" htmlFor="email">Email address</label>
                    <div className="field-shell" data-invalid={String(Boolean(errorMessage))}>
                      <input id="email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="you@email.com" aria-describedby="email-error form-status" aria-invalid={errorMessage ? 'true' : undefined} required />
                    </div>
                    <div className="error" id="email-error" role="alert" aria-live="polite">{errorMessage}</div>
                    <button className="submit" type="submit">
                      <span>Continue with email</span>
                      <span className="submit-arrow" aria-hidden="true">→</span>
                    </button>
                    <p className="fine"><strong>Secure magic link.</strong> No password to remember.</p>
                    <div className="status" id="form-status" role="status" aria-live="polite" />
                  </form>
                </div>
              </div>
            )}
          </div>

          <footer className="foot" aria-label="IQ Card essence">
            <span>Physical.</span><span>Digital.</span><span>Yours.</span>
          </footer>
        </section>

        <aside className="visual" aria-label="IQ Card product preview">
          <div className="visual-meta"><span>CLASSIC ATELIER</span><span>BEGIN YOUR IDENTITY</span></div>
          <div className="card-scene">
            <div className="card-wrap">
              <div className="card">
                <div className="card-content">
                  <span className="card-mark">iq</span>
                  <span className="card-micro">NFC / IQ 01</span>
                  <strong className="card-name">YOUR NAME</strong>
                </div>
              </div>
              <div className="edge" />
            </div>
          </div>
          <div className="card-caption"><strong>WALNUT · MATTE</strong><span>Your card begins here.</span></div>
        </aside>
      </main>
    </>
  )
}
