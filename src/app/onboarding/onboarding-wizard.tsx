'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import {
  completeOnboarding,
  saveAddressStep,
  saveContactStep,
  saveContentStep,
  saveIdentityStep,
  savePreviewStep,
} from '@/app/actions/onboarding'
import type { OnboardingActionState } from '@/lib/onboarding/action-runner'
import { onboardingPath, onboardingSteps } from '@/lib/onboarding/steps'
import type { OnboardingStep } from '@/lib/onboarding/types'
import type { Profile } from '@/lib/profile/types'
import { onboardingStepLabels } from './onboarding-styles'
import { publicProfileUrl } from '@/lib/site-routing'

const initialState: OnboardingActionState = { ok: false, fieldErrors: {} }
type StepAction = (state: OnboardingActionState, formData: FormData) => Promise<OnboardingActionState>

const actions: Record<OnboardingStep, StepAction> = {
  identity: saveIdentityStep,
  contact: saveContactStep,
  content: saveContentStep,
  address: saveAddressStep,
  preview: savePreviewStep,
  publish: completeOnboarding,
}

const stepCopy: Record<OnboardingStep, { eyebrow: string; title: string; lead: string }> = {
  identity: { eyebrow: '01 · IDENTITY', title: 'Start with you.', lead: 'Add your name and the details you want people to see on your profile.' },
  contact: { eyebrow: '02 · CONTACT', title: 'Choose how people reach you.', lead: 'Everything here is optional and private unless you explicitly make it visible.' },
  content: { eyebrow: '03 · CONTENT', title: 'Give people somewhere useful to go.', lead: 'Add complete links now, or leave this step empty and return later.' },
  address: { eyebrow: '04 · ADDRESS', title: 'Choose your public address.', lead: 'This is the short IQ Card URL you can share everywhere.' },
  preview: { eyebrow: '05 · PREVIEW', title: 'See it before anyone else does.', lead: 'This draft remains private until IQ Card approves it.' },
  publish: { eyebrow: '06 · REVIEW', title: 'Send it for review.', lead: 'Your profile will stay private until IQ Card approves it.' },
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  return message ? <p id={id} className="onboarding-field-error" aria-live="polite">{message}</p> : null
}

function splitName(name: string) {
  if (name.trim().toUpperCase() === 'YOUR NAME' || name.trim().toUpperCase() === 'GUEST USER') return { firstName: '', lastName: '' }
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

export function OnboardingWizard({ step, profile, verifiedEmail, designId, siteUrl }: { step: OnboardingStep; profile: Profile; verifiedEmail: string; designId: string | null; siteUrl: string }) {
  const router = useRouter()
  const displayUrl = publicProfileUrl(siteUrl, profile.slug).replace(/^https?:\/\//, '')
  const addressPrefix = `${new URL(siteUrl).host}/`
  const [state, formAction, pending] = useActionState(actions[step], initialState)
  const [links, setLinks] = useState(profile.profile_links.map(({ label, url }) => ({ label, url })))
  const { firstName, lastName } = splitName(profile.full_name)
  const index = onboardingSteps.indexOf(step)
  const previous = onboardingSteps[index - 1]
  const copy = stepCopy[step]

  useEffect(() => {
    if (state.ok && state.next) {
      router.push(state.next)
      return
    }
    const invalid = document.querySelector('[aria-invalid="true"]')
    if (invalid instanceof HTMLElement) invalid.focus()
  }, [router, state])

  const addLink = () => setLinks((current) => current.length >= 12 ? current : [...current, { label: '', url: '' }])
  const updateLink = (linkIndex: number, key: 'label' | 'url', value: string) => setLinks((current) => current.map((link, currentIndex) => currentIndex === linkIndex ? { ...link, [key]: value } : link))
  const removeLink = (linkIndex: number) => setLinks((current) => current.filter((_, currentIndex) => currentIndex !== linkIndex))

  return <section className="onboarding-stage" aria-labelledby="onboarding-title">
    <div className="onboarding-copy">
      <p>{copy.eyebrow}</p><h1 id="onboarding-title">{copy.title}</h1><span>{copy.lead}</span>
      <div className="onboarding-card-note"><i /><div><strong>Your saved card design is connected.</strong><small>{designId ? `${designId} · ` : ''}The saved design stays unchanged while you finish your profile.</small></div></div>
    </div>

    <form action={formAction} className="onboarding-form" noValidate>
      {step === 'identity' && <>
        <div className="onboarding-grid">
          <label htmlFor="onboarding-first-name"><span>First name <em>Required</em></span><input id="onboarding-first-name" name="firstName" defaultValue={firstName} required aria-invalid={Boolean(state.fieldErrors.firstName)} aria-describedby="firstName-error" /><ErrorText id="firstName-error" message={state.fieldErrors.firstName} /></label>
          <label htmlFor="onboarding-last-name"><span>Last name <em>Required</em></span><input id="onboarding-last-name" name="lastName" defaultValue={lastName} required aria-invalid={Boolean(state.fieldErrors.lastName)} aria-describedby="lastName-error" /><ErrorText id="lastName-error" message={state.fieldErrors.lastName} /></label>
          <label className="wide" htmlFor="onboarding-headline"><span>Role or title <small>Optional</small></span><input id="onboarding-headline" name="headline" defaultValue={profile.headline} aria-invalid={Boolean(state.fieldErrors.headline)} aria-describedby="headline-error" /><ErrorText id="headline-error" message={state.fieldErrors.headline} /></label>
          <label className="wide" htmlFor="onboarding-bio"><span>Short biography <small>Optional</small></span><textarea id="onboarding-bio" name="bio" defaultValue={profile.bio} rows={5} aria-invalid={Boolean(state.fieldErrors.bio)} aria-describedby="bio-error" /><ErrorText id="bio-error" message={state.fieldErrors.bio} /></label>
        </div>
      </>}

      {step === 'contact' && <div className="onboarding-grid">
        <div className="onboarding-verified wide"><span>Verified account email</span><strong>{verifiedEmail}</strong><small>Used securely for sign-in. It is never made public automatically.</small></div>
        {[
          ['publicEmail', 'Public email', profile.email, profile.public_email_visible],
          ['phone', 'Phone', profile.phone, profile.phone_visible],
          ['whatsapp', 'WhatsApp', profile.whatsapp ?? '', profile.whatsapp_visible],
          ['location', 'Location', profile.location ?? '', profile.location_visible],
        ].map(([name, label, value, visible]) => {
          const fieldName = String(name)
          const inputId = `onboarding-${fieldName}`
          const visibilityId = `${inputId}-visible`
          return <div className="onboarding-contact-field" key={fieldName}>
            <label htmlFor={inputId}><span>{String(label)} <small>Optional</small></span></label>
            <input id={inputId} name={fieldName} defaultValue={String(value ?? '')} aria-invalid={Boolean(state.fieldErrors[fieldName])} aria-describedby={`${fieldName}-error`} />
            <ErrorText id={`${fieldName}-error`} message={state.fieldErrors[fieldName]} />
            <label className="onboarding-visibility" htmlFor={visibilityId}>
              <input id={visibilityId} type="checkbox" name={`${fieldName}Visible`} defaultChecked={Boolean(visible)} />
              Show on public profile
            </label>
          </div>
        })}
      </div>}

      {step === 'content' && <div className="onboarding-links">
        <input id="onboarding-links" type="hidden" name="links" value={JSON.stringify(links)} readOnly />
        {links.map((link, linkIndex) => <div className="onboarding-link-row" key={linkIndex}>
          <label htmlFor={`onboarding-link-${linkIndex}-label`}><span>Label</span><input id={`onboarding-link-${linkIndex}-label`} value={link.label} onChange={(event) => updateLink(linkIndex, 'label', event.target.value)} aria-invalid={Boolean(state.fieldErrors[`links.${linkIndex}.label`])} aria-describedby={`link-${linkIndex}-label-error`} /><ErrorText id={`link-${linkIndex}-label-error`} message={state.fieldErrors[`links.${linkIndex}.label`]} /></label>
          <label htmlFor={`onboarding-link-${linkIndex}-url`}><span>Secure URL</span><input id={`onboarding-link-${linkIndex}-url`} value={link.url} onChange={(event) => updateLink(linkIndex, 'url', event.target.value)} aria-invalid={Boolean(state.fieldErrors[`links.${linkIndex}.url`])} aria-describedby={`link-${linkIndex}-url-error`} /><ErrorText id={`link-${linkIndex}-url-error`} message={state.fieldErrors[`links.${linkIndex}.url`]} /></label>
          <button type="button" onClick={() => removeLink(linkIndex)} aria-label={`Remove link ${linkIndex + 1}`}>Remove</button>
        </div>)}
        <ErrorText id="links-error" message={state.fieldErrors.links} />
        <button type="button" className="onboarding-add" onClick={addLink}>＋ Add link</button>
      </div>}

      {step === 'address' && <div className="onboarding-address"><label htmlFor="onboarding-slug"><span>Public profile URL <em>Required</em></span><div><b>{addressPrefix}</b><input id="onboarding-slug" name="slug" defaultValue={profile.slug} required aria-invalid={Boolean(state.fieldErrors.slug)} aria-describedby="slug-error" /></div><ErrorText id="slug-error" message={state.fieldErrors.slug} /></label>{state.alternatives?.length ? <p>Try: {state.alternatives.join(' or ')}</p> : null}</div>}

      {step === 'preview' && <div className="onboarding-preview"><span>PRIVATE PREVIEW</span><h2>{profile.full_name || 'Your name'}</h2><p>{profile.headline || 'Your role or title'}</p><small>{profile.bio || 'Your short biography will appear here.'}</small><div>{profile.profile_links.map((link) => <span key={link.id}>{link.label}</span>)}</div><strong>{displayUrl}</strong></div>}

      {step === 'publish' && <div className="onboarding-publish"><div><span>PRIVATE UNTIL APPROVED</span><strong>Your profile is ready for Nikki to review.</strong><p>We’ll send it to the IQ Card admin queue. Your profile at {displayUrl} will remain private until it is approved.</p><small>Only IQ Card can publish</small></div><ErrorText id="publish-name-error" message={state.fieldErrors.fullName} /><ErrorText id="publish-email-error" message={state.fieldErrors.verifiedEmail} /><ErrorText id="publish-slug-error" message={state.fieldErrors.slug} /></div>}

      {state.formError && <p className="onboarding-form-error" role="alert" aria-live="polite">{state.formError}</p>}
      <footer className="onboarding-actions">
        {previous ? <Link href={onboardingPath(previous)}>← Back</Link> : <Link href="/customize">← Back to card</Link>}
        <div>
          {step === 'publish' ? <button type="submit" disabled={pending}>{pending ? 'Sending for review…' : 'Submit for review'}</button> : <button type="submit" disabled={pending}>{pending ? 'Saving…' : step === 'preview' ? 'Looks good — Continue' : 'Save & Continue'}</button>}
        </div>
      </footer>
    </form>
  </section>
}
