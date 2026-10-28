export function SignOutButton({ label = 'Sign out' }: { label?: string }) {
  return <form action="/auth/sign-out" method="post" className="iq-sign-out-form">
    <button type="submit" className="iq-sign-out-button">{label}</button>
  </form>
}
