'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { useFormStatus } from 'react-dom'

import { PublicProfile } from '@/components/public-profile'
import { PROFILE_PHOTO_MAX_BYTES } from '@/lib/profile/photo'
import { PROFILE_TEMPLATE_OPTIONS } from '@/lib/profile/presentation'
import { validateLinkInput } from '@/lib/profile/validation'
import type { CoverPresentation, Profile, ProfileTemplate } from '@/lib/profile/types'

type FormAction = (formData: FormData) => void | Promise<void>
type ButtonAction = () => void | Promise<void>
type CoverResult = { coverPath: string | null }
type CoverFormAction = (formData: FormData) => CoverResult | Promise<CoverResult>
type CoverButtonAction = () => CoverResult | Promise<CoverResult>

type DigitalProfileEditorProps = {
  profile: Profile
  presentation: CoverPresentation
  saveDraftAction: FormAction
  publishAction: ButtonAction
  uploadCoverAction: CoverFormAction
  deleteCoverAction: CoverButtonAction
  uploadPhotoAction: FormAction
  deletePhotoAction: FormAction
  saveLinksAction: FormAction
}

function PendingButton({ idle, pending, className = '' }: { idle: string; pending: string; className?: string }) {
  const { pending: isPending } = useFormStatus()
  return <button className={className} type="submit" disabled={isPending}>{isPending ? pending : idle}</button>
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

function CoverMedia({
  coverPath,
  onUpload,
  onDelete,
}: {
  coverPath: string | null
  onUpload: CoverFormAction
  onDelete: CoverButtonAction
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const maxMegabytes = PROFILE_PHOTO_MAX_BYTES / (1024 * 1024)

  const upload = async (formData: FormData) => {
    setMessage('')
    setError('')
    try {
      const result = await onUpload(formData)
      setMessage(result.coverPath ? 'Cover updated.' : 'Cover removed.')
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Cover upload failed.'))
    }
  }

  const remove = async () => {
    setMessage('')
    setError('')
    try {
      await onDelete()
      setMessage('Cover removed.')
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Unable to remove cover.'))
    }
  }

  return <div className="digital-profile-media">
    <div className={`digital-profile-cover-thumb${coverPath ? '' : ' is-empty'}`}>
      {coverPath ? <Image src={`/api/profile-cover?path=${encodeURIComponent(coverPath)}`} alt="Current Cover image" fill sizes="220px" unoptimized /> : <span>Add a Cover image</span>}
    </div>
    <div className="digital-profile-media-copy">
      <strong>{coverPath ? 'Your Cover image' : 'Choose a Cover image'}</strong>
      <p>JPEG, PNG, or WebP · up to {maxMegabytes} MB</p>
      <div className="digital-profile-media-actions">
        <form action={upload}>
          <label className="digital-profile-button digital-profile-button--light" htmlFor="digital-profile-cover-input">{coverPath ? 'Change Cover' : 'Add Cover'}</label>
          <input
            ref={inputRef}
            className="digital-profile-file-input"
            id="digital-profile-cover-input"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              if (event.currentTarget.files?.length) event.currentTarget.form?.requestSubmit()
            }}
          />
        </form>
        {coverPath ? <form action={remove}><PendingButton className="digital-profile-text-button" idle="Remove" pending="Removing…" /></form> : null}
      </div>
      <p className="digital-profile-feedback" role={error ? 'alert' : 'status'} aria-live="polite">{error || message}</p>
    </div>
  </div>
}

function ProfilePhotoControls({ profile, uploadPhotoAction, deletePhotoAction }: Pick<DigitalProfileEditorProps, 'profile' | 'uploadPhotoAction' | 'deletePhotoAction'>) {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const upload = async (formData: FormData) => {
    setMessage('')
    setError('')
    try {
      await uploadPhotoAction(formData)
      setMessage('Profile photo updated.')
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Photo upload failed.'))
    }
  }
  const remove = async (formData: FormData) => {
    setMessage('')
    setError('')
    try {
      await deletePhotoAction(formData)
      setMessage('Profile photo removed.')
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Unable to remove photo.'))
    }
  }

  return <div className="digital-profile-photo-row">
    <div className="digital-profile-photo-thumb">
      {profile.photo_url ? <Image src={profile.photo_url} alt="Current profile photo" fill sizes="72px" unoptimized /> : <span aria-hidden="true">+</span>}
    </div>
    <div>
      <strong>Profile photo</strong>
      <p>Shared with Minimal and your profile details.</p>
      <div className="digital-profile-media-actions">
        <form action={upload}>
          <label className="digital-profile-button digital-profile-button--light" htmlFor="digital-profile-photo-input">{profile.photo_path ? 'Change photo' : 'Add photo'}</label>
          <input
            className="digital-profile-file-input"
            id="digital-profile-photo-input"
            name="photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              if (event.currentTarget.files?.length) event.currentTarget.form?.requestSubmit()
            }}
          />
        </form>
        {profile.photo_path ? <form action={remove}><PendingButton className="digital-profile-text-button" idle="Remove photo" pending="Removing…" /></form> : null}
      </div>
      <p className="digital-profile-feedback" role={error ? 'alert' : 'status'} aria-live="polite">{error || message}</p>
    </div>
  </div>
}

const QUICK_LINKS = ['LinkedIn', 'Instagram', 'Website', 'Portfolio', 'WhatsApp', 'Email', 'Phone', 'YouTube', 'GitHub', 'Behance', 'Dribbble', 'X']
type EditableLink = { key: string; label: string; url: string }

function ProfileLinksEditor({ profile, saveLinksAction }: Pick<DigitalProfileEditorProps, 'profile' | 'saveLinksAction'>) {
  const [links, setLinks] = useState<EditableLink[]>(() => profile.profile_links.map((link, index) => ({ key: `saved-${link.id}-${index}`, label: link.label, url: link.url })))
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState('')

  const addLink = (label = '') => {
    if (links.length >= 12) return
    setLinks((current) => [...current, { key: `new-${Date.now()}-${current.length}`, label, url: '' }])
    setMessage('')
    setSaveError('')
  }
  const updateLink = (key: string, field: 'label' | 'url', value: string) => {
    setLinks((current) => current.map((link) => link.key === key ? { ...link, [field]: value } : link))
    setRowErrors((current) => ({ ...current, [key]: '' }))
    setMessage('')
  }
  const removeLink = (key: string) => {
    setLinks((current) => current.filter((link) => link.key !== key))
    setRowErrors((current) => { const next = { ...current }; delete next[key]; return next })
    setMessage('')
  }
  const moveLink = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= links.length) return
    setLinks((current) => {
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    setMessage('')
  }
  const save = async (formData: FormData) => {
    const errors: Record<string, string> = {}
    links.forEach((link) => {
      if (!link.label.trim() && !link.url.trim()) return
      const validationError = validateLinkInput(link.label, link.url)
      if (validationError) errors[link.key] = validationError
    })
    if (links.length > 12) setSaveError('You can add up to 12 links.')
    if (Object.keys(errors).length || links.length > 12) {
      setRowErrors(errors)
      return
    }
    setRowErrors({})
    setMessage('')
    setSaveError('')
    try {
      await saveLinksAction(formData)
      setMessage('Links updated.')
    } catch (submissionError) {
      setSaveError(errorMessage(submissionError, 'Unable to update links.'))
    }
  }
  const serializedLinks = JSON.stringify(links.map(({ label, url }) => ({ label, url })))

  return <section className="digital-profile-links" id="links" aria-labelledby="digital-profile-links-title">
    <div className="digital-profile-links-heading"><div><span>LINKS</span><h3 id="digital-profile-links-title">Add the places people can find you.</h3></div><small>{links.length}/12</small></div>
    <div className="digital-profile-quick-add" aria-label="Quick add a link">
      {QUICK_LINKS.map((label) => <button key={label} type="button" disabled={links.length >= 12} onClick={() => addLink(label)}>{label}</button>)}
      <button type="button" disabled={links.length >= 12} onClick={() => addLink()}>+ Custom link</button>
    </div>
    <form action={save}>
      <input type="hidden" name="links" value={serializedLinks} readOnly />
      <div className="digital-profile-link-rows">
        {links.map((link, index) => <div className="digital-profile-link-row" data-link-row key={link.key}>
          <div className="digital-profile-link-fields">
            <label>Label<input name="label" value={link.label} maxLength={60} aria-label={`Link ${index + 1} label`} onChange={(event) => updateLink(link.key, 'label', event.currentTarget.value)} /></label>
            <label>URL<input name="url" value={link.url} maxLength={2048} placeholder="https://" aria-label={`Link ${index + 1} URL`} onChange={(event) => updateLink(link.key, 'url', event.currentTarget.value)} /></label>
          </div>
          <div className="digital-profile-link-controls">
            <button type="button" aria-label={`Move ${link.label || `link ${index + 1}`} up`} disabled={index === 0} onClick={() => moveLink(index, -1)}>↑</button>
            <button type="button" aria-label={`Move ${link.label || `link ${index + 1}`} down`} disabled={index === links.length - 1} onClick={() => moveLink(index, 1)}>↓</button>
            <button type="button" aria-label={`Remove ${link.label || `link ${index + 1}`}`} onClick={() => removeLink(link.key)}>Delete</button>
          </div>
          {rowErrors[link.key] ? <p role="alert" className="digital-profile-link-error">{rowErrors[link.key]}</p> : null}
        </div>)}
      </div>
      <div className="digital-profile-links-actions">
        <button type="button" className="digital-profile-button digital-profile-button--light" disabled={links.length >= 12} onClick={() => addLink()}>+ Add another link</button>
        <PendingButton className="digital-profile-button digital-profile-button--dark" idle="Save Links" pending="Saving…" />
      </div>
    </form>
    <p className="digital-profile-feedback" role={saveError ? 'alert' : 'status'} aria-live="polite">{saveError || message}</p>
  </section>
}

export function DigitalProfileEditor({
  profile,
  presentation,
  saveDraftAction,
  publishAction,
  uploadCoverAction,
  deleteCoverAction,
  uploadPhotoAction,
  deletePhotoAction,
  saveLinksAction,
}: DigitalProfileEditorProps) {
  const [draft, setDraft] = useState<CoverPresentation>(presentation)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const selectTemplate = (template: ProfileTemplate) => setDraft((current) => ({ ...current, template }))
  const updateCover = <Key extends keyof CoverPresentation['cover']>(key: Key, value: CoverPresentation['cover'][Key]) => {
    setDraft((current) => ({ ...current, cover: { ...current.cover, [key]: value } }))
  }
  const saveDraft = async (formData: FormData) => {
    setNotice('')
    setError('')
    try {
      await saveDraftAction(formData)
      setNotice('Draft saved. Your public profile has not changed.')
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Unable to save presentation.'))
    }
  }
  const publish = async (formData: FormData) => {
    setNotice('')
    setError('')
    try {
      await saveDraftAction(formData)
      await publishAction()
      setNotice('Digital profile published.')
    } catch (submissionError) {
      setError(errorMessage(submissionError, 'Unable to publish presentation.'))
    }
  }
  const uploadCover = async (formData: FormData) => {
    const result = await uploadCoverAction(formData)
    updateCover('coverPath', result.coverPath)
    return result
  }
  const deleteCover = async () => {
    const result = await deleteCoverAction()
    updateCover('coverPath', result.coverPath)
    return result
  }
  const serializedDraft = JSON.stringify(draft)

  return <div className="digital-profile-shell">
    <header className="digital-profile-topbar">
      <Link className="digital-profile-brand" href="/"><b>iq</b><span><strong>Your dashboard</strong><small>DIGITAL PROFILE</small></span></Link>
      <nav aria-label="Digital Profile navigation"><Link href="/dashboard">Dashboard</Link><Link href="/dashboard/preview">Full preview</Link></nav>
    </header>

    <main className="digital-profile-page">
      <section className="digital-profile-intro">
        <div><span>YOUR DIGITAL PROFILE</span><h1>Choose how<br />people meet you.</h1></div>
        <p>Your details stay the same. Select the presentation that feels most like you, then publish when it is ready.</p>
      </section>

      <div className="digital-profile-workspace">
        <div className="digital-profile-controls">
          <section className="digital-profile-panel" aria-labelledby="digital-profile-template-title">
            <div className="digital-profile-panel-head"><span>01 · TEMPLATE</span><h2 id="digital-profile-template-title">Your presentation.</h2><p>Switch any time without losing your shared details or Cover settings.</p></div>
            <div className="digital-profile-templates">
              {PROFILE_TEMPLATE_OPTIONS.map((option) => <button key={option.id} type="button" aria-label={`${option.number} ${option.name}`} className={draft.template === option.id ? 'active' : ''} aria-pressed={draft.template === option.id} onClick={() => selectTemplate(option.id)}><span>{option.number}</span><strong>{option.name}</strong><small>{option.description}</small><i aria-hidden="true" /></button>)}
            </div>
          </section>

          <section className="digital-profile-panel" aria-labelledby="digital-profile-photo-title">
            <div className="digital-profile-panel-head"><span>02 · PROFILE PHOTO</span><h2 id="digital-profile-photo-title">Your picture.</h2><p>This shared photo appears across every profile style.</p></div>
            <ProfilePhotoControls profile={profile} uploadPhotoAction={uploadPhotoAction} deletePhotoAction={deletePhotoAction} />
          </section>

          {draft.template === 'cover' ? <section className="digital-profile-panel" aria-labelledby="digital-profile-appearance-title">
            <div className="digital-profile-panel-head"><span>03 · APPEARANCE</span><h2 id="digital-profile-appearance-title">Set the scene.</h2><p>Shape the image behind your identity.</p></div>
            <CoverMedia coverPath={draft.cover.coverPath} onUpload={uploadCover} onDelete={deleteCover} />
            <div className="digital-profile-range">
              <label htmlFor="digital-profile-overlay"><span>Darken background</span><output>{Math.round(draft.cover.overlay * 100)}%</output></label>
              <input id="digital-profile-overlay" type="range" min="0.15" max="0.7" step="0.01" value={draft.cover.overlay} onChange={(event) => updateCover('overlay', Number(event.target.value))} />
            </div>
            <div className="digital-profile-range">
              <label htmlFor="digital-profile-focal"><span>Vertical image position</span><output>{draft.cover.focalY}%</output></label>
              <input id="digital-profile-focal" type="range" min="0" max="100" step="1" value={draft.cover.focalY} onChange={(event) => updateCover('focalY', Number(event.target.value))} />
            </div>
            <fieldset className="digital-profile-alignment">
              <legend>Identity alignment</legend>
              <div>
                <button type="button" aria-pressed={draft.cover.alignment === 'lower-left'} onClick={() => updateCover('alignment', 'lower-left')}>Lower left</button>
                <button type="button" aria-pressed={draft.cover.alignment === 'center'} onClick={() => updateCover('alignment', 'center')}>Centered</button>
              </div>
            </fieldset>
          </section> : null}

          <section className="digital-profile-panel digital-profile-content-panel" aria-labelledby="digital-profile-content-title">
            <div className="digital-profile-panel-head"><span>{draft.template === 'cover' ? '04' : '03'} · CONTENT</span><h2 id="digital-profile-content-title">The details are shared.</h2><p>Edit your identity and links once. Every template uses them.</p></div>
            <dl><div><dt>Identity</dt><dd>{profile.full_name || 'Add your name'} · {profile.headline || 'Add your role'}</dd></div><div><dt>Content</dt><dd>{profile.bio ? 'Bio ready' : 'Add a bio'}</dd></div></dl>
            <div className="digital-profile-content-links"><Link href="/dashboard#identity">Edit identity →</Link></div>
            <ProfileLinksEditor profile={profile} saveLinksAction={saveLinksAction} />
          </section>

          <section className="digital-profile-publish" aria-labelledby="digital-profile-publish-title">
            <div><span>READY WHEN YOU ARE</span><h2 id="digital-profile-publish-title">Keep it private, or make it live.</h2><p>Saving stores this draft. Publishing updates the design at /{profile.slug}.</p></div>
            <div className="digital-profile-publish-actions">
              <form action={saveDraft}><input type="hidden" name="presentation" value={serializedDraft} readOnly /><PendingButton className="digital-profile-button digital-profile-button--light" idle="Save Draft" pending="Saving…" /></form>
              <form action={publish}><input type="hidden" name="presentation" value={serializedDraft} readOnly /><PendingButton className="digital-profile-button digital-profile-button--dark" idle="Publish" pending="Publishing…" /></form>
            </div>
            <p className="digital-profile-action-feedback" role={error ? 'alert' : 'status'} aria-live="polite">{error || notice}</p>
          </section>
        </div>

        <aside className="digital-profile-preview-column">
          <div className="digital-profile-preview-sticky">
            <div className="digital-profile-preview-head"><span>LIVE PREVIEW</span><strong>{PROFILE_TEMPLATE_OPTIONS.find(({ id }) => id === draft.template)?.number} {PROFILE_TEMPLATE_OPTIONS.find(({ id }) => id === draft.template)?.name}</strong></div>
            <section className="digital-profile-phone" aria-label="Profile phone preview">
              <div className="digital-profile-phone-screen"><PublicProfile profile={profile} presentation={draft} preview /></div>
            </section>
            <p>This preview uses your private draft. Visitors keep seeing the published version until you publish.</p>
          </div>
        </aside>
      </div>
    </main>
  </div>
}
