'use client'

import { useEffect, useRef } from 'react'
import { PublicProfile } from '@/components/public-profile'
import { trapDialogFocus } from '@/lib/browser/focus-trap'
import type { Profile, CoverPresentation } from '@/lib/profile/types'

export function DraftPreview({ profile, presentation, onClose }: { profile: Profile; presentation: CoverPresentation; onClose: () => void }) {
  const dialog = useRef<HTMLElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    close.current?.focus()
    return () => { document.body.style.overflow = overflow; opener?.focus() }
  }, [])
  return <section className="digital-draft-preview" ref={dialog} role="dialog" aria-modal="true" aria-label="Full preview of your unsaved draft" onKeyDown={(event) => {
    if (event.key === 'Escape') onClose()
    else if (dialog.current) trapDialogFocus(dialog.current, event)
  }}>
    <header><span>Private preview · includes your unsaved edits</span><button type="button" ref={close} onClick={onClose} aria-label="Close full preview">Back to editing</button></header>
    <PublicProfile profile={profile} presentation={presentation} preview />
  </section>
}
