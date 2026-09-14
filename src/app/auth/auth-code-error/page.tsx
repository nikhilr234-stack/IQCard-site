import Link from 'next/link'
import { registrationRecoveryContent } from '@/lib/auth/registration-recovery'
import { safeReturnPath } from '@/lib/auth/roles'

type AuthCodeErrorPageProps = {
  searchParams: Promise<{ reason?: string; next?: string }>
}

const pageStyles = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; background: #fff; color: #151518; font-family: Helvetica, Arial, sans-serif; }
  main { width: min(100% - 40px, 520px); margin: 0 auto; padding: 18vh 0 48px; }
  .brand { display: inline-block; color: #151518; font-size: 26px; font-weight: 700; letter-spacing: -.11em; line-height: 1; text-decoration: none; }
  .eyebrow { margin: 64px 0 14px; color: #ff4f9a; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
  h1 { margin: 0; font-size: clamp(38px, 8vw, 66px); line-height: .92; letter-spacing: -.07em; }
  p { color: #6f7076; font-size: 16px; line-height: 1.5; }
  form { margin-top: 30px; padding: 24px; border: 1px solid #e5e5e8; border-radius: 22px; }
  label { display: block; margin-bottom: 8px; color: #6f7076; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
  input { width: 100%; margin-bottom: 16px; border: 1px solid #d8d8dd; border-radius: 12px; padding: 13px 14px; color: #151518; background: #fff; font-size: 16px; outline: none; }
  input:focus { border-color: #151518; box-shadow: 0 0 0 3px rgba(255,79,154,.16); }
  button { width: 100%; border: 0; border-radius: 999px; padding: 14px 18px; color: #fff; background: #151518; font-size: 14px; font-weight: 700; cursor: pointer; }
  a { color: #151518; font-weight: 700; text-underline-offset: 4px; }
  .back { display: inline-block; margin-top: 24px; }
`

export default async function AuthCodeErrorPage({ searchParams }: AuthCodeErrorPageProps) {
  const params = await searchParams
  const browserMismatch = params.reason === 'browser-mismatch'
  const linkRejected = params.reason === 'invalid-link'
  const registrationRecovery = registrationRecoveryContent(params.reason)
  const next = safeReturnPath(params.next ?? null)
  const loginHref = next ? `/login?next=${encodeURIComponent(next)}` : '/login'

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
      <main>
        <Link className="brand" data-iq-brand="primary" href="/" aria-label="IQ Card home">iq</Link>
        <p className="eyebrow">IQ CARD SIGN IN</p>
        <h1>{registrationRecovery?.title ?? (browserMismatch || linkRejected ? 'That sign-in link did not work.' : 'Your sign-in link expired.')}</h1>
        <p>{registrationRecovery?.message ?? `${browserMismatch ? 'This link could not be completed in this browser.' : 'The link may have expired or already been used.'} Request a fresh sign-in email to continue to your Home Dashboard.`}</p>
        <Link className="back" href={registrationRecovery?.actionHref ?? loginHref}>{registrationRecovery?.actionLabel ?? 'Request a new sign-in email'}</Link>
      </main>
    </>
  )
}
