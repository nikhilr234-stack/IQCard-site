'use client'

import { useState } from 'react'
import { createGift } from '@/app/actions/gifts'

type Result = { ok: true; name: string; slug: string; profileId: string; url: string } | { ok: false; error: string }

export function GiftCreateForm() {
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  async function submit(form: FormData) {
    setBusy(true); setResult(null)
    try { setResult(await createGift(form)) }
    catch { setResult({ ok: false, error: 'Gift could not be created. Please try again.' }) }
    finally { setBusy(false) }
  }

  if (result?.ok) return <section className="gift-success" aria-live="polite">
    <p className="gift-eyebrow">GIFT READY</p><h1>Gift ready</h1><h2>{result.name}</h2><a href={result.url}>{result.url.replace(/^https?:\/\//, '')}</a>
    <div className="gift-actions"><button onClick={async () => { await navigator.clipboard.writeText(result.url); setCopied(true) }}>{copied ? 'Copied' : 'Copy URL'}</button><a href={`/${result.slug}`} target="_blank" rel="noreferrer">Open Profile</a><a href={`/admin/gifts/${result.profileId}/edit`}>Add Details</a></div>
  </section>

  return <form action={submit} className="gift-form">
    <label>Full name *<input name="fullName" placeholder="Full name" required maxLength={161} autoComplete="name" /></label>
    <label>Email *<input type="email" name="email" placeholder="recipient@example.com" required autoComplete="email" /></label>
    <label>Role *<input name="role" placeholder="e.g. Founder, Designer" required maxLength={120} /></label>
    <details><summary>Personalize</summary><div className="gift-personalize">
      <label>Tagline<input name="tagline" /></label><label>Phone<input name="phone" type="tel" /></label><label>WhatsApp<input name="whatsapp" type="tel" /></label><label>Location<input name="location" /></label>
      <label>LinkedIn<input name="linkedin" type="url" placeholder="https://linkedin.com/in/…" /></label><label>Instagram<input name="instagram" type="url" placeholder="https://instagram.com/…" /></label><label>Website<input name="website" type="url" placeholder="https://…" /></label>
      <label>Portrait<input name="portrait" type="file" accept="image/jpeg,image/png,image/webp" /></label><label>Cover<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" /></label>
    </div></details>
    {result && !result.ok ? <p role="alert">{result.error}</p> : null}
    <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'CREATE & PUBLISH GIFT'}</button>
  </form>
}
