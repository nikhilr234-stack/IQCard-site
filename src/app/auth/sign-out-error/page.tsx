import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'

export default function SignOutErrorPage() {
  return <main className="sign-out-error">
    <Link href="/" aria-label="IQ Card home">iq</Link>
    <h1>Sign out could not finish.</h1>
    <p>We could not confirm that your session ended. Please try again.</p>
    <SignOutButton label="Try signing out again" />
    <p><Link href="/dashboard">Back to dashboard</Link></p>
  </main>
}
