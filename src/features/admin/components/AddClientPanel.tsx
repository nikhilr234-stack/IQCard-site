import { useState, type FormEvent, type RefObject } from 'react'

export type OnboardInput = { email: string; name: string; segment: string }

const segments = ['Architecture', 'Business', 'Consulting', 'Creator', 'Design', 'Personal', 'Real Estate', 'Sales', 'Technology']

export function AddClientPanel({ onOnboard, emailInputRef }: { onOnboard: (input: OnboardInput) => Promise<void>; emailInputRef: RefObject<HTMLInputElement | null> }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [segment, setSegment] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || pending) return
    setError('')
    setPending(true)
    try {
      await onOnboard({ email: email.trim(), name: name.trim(), segment: segment || 'Unassigned' })
      setEmail('')
      setName('')
      setSegment('')
    } catch {
      setError('Client invitation could not be completed. Please try again.')
    } finally {
      setPending(false)
    }
  }

  return <section className="onboarding-panel panel" aria-labelledby="onboard-title"><div className="onboarding-panel__content"><span className="eyebrow">ONBOARD A NEW CLIENT</span><h2 id="onboard-title">Add a client</h2><p>They’ll receive a secure magic link and can start with a private draft profile.</p><form className="onboarding-form" onSubmit={submit}><label><span>Client email</span><input ref={emailInputRef} aria-label="Client email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="client@company.com" /></label><label><span>Client name <em>(optional)</em></span><input aria-label="Client name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Acme Inc." /></label><label><span>Segment <em>(optional)</em></span><select aria-label="Client segment" value={segment} onChange={(event) => setSegment(event.target.value)}><option value="">Unassigned</option>{segments.map((item) => <option key={item}>{item}</option>)}</select></label><button className="primary-button" type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send access link'}</button></form>{error ? <p className="form-error" role="alert">{error}</p> : null}</div><div className="onboarding-panel__brand" aria-hidden="true"><div className="brand-card-object">iq</div><strong>Invite.<br />Create.<br />Grow.</strong></div></section>
}
