import { loginStyles } from '../../components/login-styles'
import { safeReturnPath } from './roles'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export type AuthCallbackErrorReason = 'browser-mismatch' | 'otp-invalid' | 'invalid-link'

export function callbackErrorReason(error: { code?: string } | null): AuthCallbackErrorReason {
  return error?.code === 'pkce_code_verifier_not_found' ? 'browser-mismatch' : 'invalid-link'
}

const callbackStyles = `${loginStyles}
    main.page { width: 100%; max-width: none; margin: 0; padding: 72px 0 0; }
    .nav-meta { display: inline-flex; align-items: center; gap: 10px; color: #73747a; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; }
    .nav-meta i { width: 7px; height: 7px; border-radius: 50%; background: var(--pink); display: inline-block; box-shadow: 0 0 0 7px rgba(255,79,154,.08); }
    .status-chip { margin-top: 36px; display: inline-flex; align-items: center; gap: 10px; padding: 11px 14px; border: 1px solid rgba(17,17,19,.08); border-radius: 999px; background: #fff; color: #494a50; font-size: 11px; font-weight: 600; letter-spacing: .02em; box-shadow: 0 10px 24px rgba(17,17,19,.04); }
    .status-chip i { width: 8px; height: 8px; border-radius: 50%; background: var(--pink); display: inline-block; box-shadow: 0 0 0 8px rgba(255,79,154,.10); }
    .action-wrap { margin-top: 44px; width: min(100%, 470px); }
    .action-wrap form { margin: 0; }
    .secondary-actions { margin-top: 20px; display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
    @media (max-width: 760px) {
      .nav-meta { font-size: 10px; }
      .status-chip { margin-top: 28px; }
      .mobile-card { display: block; height: 220px; margin: 30px -2px 10px; position: relative; perspective: 1000px; }
      .mobile-card .card-wrap { width: min(82vw, 390px); left: 51%; top: 50%; transform: translate(-50%,-50%) rotateX(5deg) rotateY(-10deg) rotateZ(-4deg); }
      .mobile-card .card { border-radius: 24px; }
      .mobile-card .card-mark { left: 23px; top: 21px; font-size: 41px; }
      .mobile-card .card-micro { right: 21px; top: 21px; font-size: 7px; }
      .mobile-card .card-name { left: 23px; bottom: 21px; font-size: 28px; }
      .mobile-card .edge { bottom: -6px; height: 10px; border-radius: 0 0 22px 22px; }
      .action-wrap { margin-top: 30px; width: 100%; }
    }
`

export function buildAuthCallbackPage(code: string, next: string | null): string {
  const returnPath = safeReturnPath(next)
  const nextInput = returnPath ? `<input type="hidden" name="next" value="${escapeHtml(returnPath)}">` : ''
  const safeCode = escapeHtml(code)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#ffffff">
    <meta name="description" content="Continue signing in to IQ Card with your secure magic link.">
    <title>IQ Card — Continue sign in</title>
    <style>${callbackStyles}</style>
  </head>
  <body>
    <header class="nav">
      <a class="brand" href="/" aria-label="IQ Card home">iq</a>
      <div class="nav-meta"><i aria-hidden="true"></i><span>Magic link</span></div>
    </header>

    <main class="page">
      <section class="auth" aria-labelledby="callback-title">
        <div class="auth-inner">
          <p class="eyebrow">WELCOME BACK</p>
          <h1 id="callback-title">Welcome back.</h1>
          <p class="lead">Your identity is ready to continue. Finish signing in to return to your IQ space.</p>

          <div class="status-chip"><i aria-hidden="true"></i><span>Link verified</span></div>

          <div class="mobile-card" aria-hidden="true">
            <div class="card-wrap">
              <div class="card">
                <div class="card-content">
                  <span class="card-mark">iq</span>
                  <span class="card-micro">NFC / IQ 01</span>
                  <strong class="card-name">WELCOME BACK</strong>
                </div>
              </div>
              <div class="edge"></div>
            </div>
          </div>

          <div class="action-wrap">
            <form method="post" action="/auth/callback">
              <input type="hidden" name="code" value="${safeCode}">
              ${nextInput}
              <button class="submit" type="submit"><span>Continue to IQ</span><span class="submit-arrow" aria-hidden="true">→</span></button>
            </form>
            <p class="fine"><strong>Secure magic-link sign in.</strong> One step and you're back in.</p>
            <div class="secondary-actions"><a href="/" class="text-action secondary">Back to IQ</a></div>
          </div>
        </div>

        <footer class="foot" aria-label="IQ Card essence">
          <span>Physical.</span><span>Digital.</span><span>Yours.</span>
        </footer>
      </section>

      <aside class="visual" aria-label="IQ Card product preview">
        <div class="visual-meta"><span>CLASSIC ATELIER</span><span>RETURN TO YOUR IDENTITY</span></div>
        <div class="card-scene">
          <div class="card-wrap">
            <div class="card">
              <div class="card-content">
                <span class="card-mark">iq</span>
                <span class="card-micro">NFC / IQ 01</span>
                <strong class="card-name">WELCOME BACK</strong>
              </div>
            </div>
            <div class="edge"></div>
          </div>
        </div>
        <div class="card-caption"><strong>WALNUT · MATTE</strong><span>Your identity is ready.</span></div>
      </aside>
    </main>
  </body>
</html>`
}
