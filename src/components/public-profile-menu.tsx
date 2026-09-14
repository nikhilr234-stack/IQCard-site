'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { trapDialogFocus } from '@/lib/browser/focus-trap'

export function PublicProfileMenu({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)
  const lastFocused = useRef<HTMLElement | null>(null)
  const closeButton = useRef<HTMLButtonElement | null>(null)
  const panel = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    closeButton.current?.focus()
    return () => {
      const opener = lastFocused.current
      if (opener?.isConnected) opener.focus()
      lastFocused.current = null
    }
  }, [open])

  const openMenu = (event: MouseEvent<HTMLButtonElement>) => {
    lastFocused.current = event.currentTarget
    setOpen(true)
  }

  const closeMenu = () => setOpen(false)

  return <>
    <button className="public-menu-btn" type="button" aria-label="Open profile menu" aria-controls="profile-menu-panel" aria-expanded={open} onClick={openMenu}>•••</button>
    {open ? <div className="public-menu-modal">
      <button className="public-menu-backdrop" type="button" tabIndex={-1} aria-label="Close profile menu" onClick={closeMenu} />
      <section
        className="public-menu-panel"
        id="profile-menu-panel"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-menu-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeMenu()
          else if (panel.current) trapDialogFocus(panel.current, event)
        }}
      >
        <div className="public-menu-panel-top">
          <div><div className="public-menu-title" id="profile-menu-title">Your Spaces</div><div className="public-menu-sub">Choose what side of you this card opens.</div></div>
          <button className="public-menu-close" ref={closeButton} type="button" aria-label="Close profile menu" onClick={closeMenu}>×</button>
        </div>
        <div className="public-menu-list">
          <Link className="public-menu-row active" href={`/${slug}`} aria-current="page"><span>Professional</span><span>Current</span></Link>
          <span className="public-menu-row is-disabled" aria-disabled="true"><span>Social</span><span>Coming soon</span></span>
          <span className="public-menu-row is-disabled" aria-disabled="true"><span>Creative</span><span>Coming soon</span></span>
        </div>
        <div className="public-menu-owner">
          <div className="public-menu-title">Owner</div>
          <div className="public-menu-list">
            <Link className="public-menu-row" href="/dashboard"><span>Spaces</span><span>Open →</span></Link>
            <span className="public-menu-row is-disabled" aria-disabled="true"><span>Analytics</span><span>Coming soon</span></span>
            <span className="public-menu-row is-disabled" aria-disabled="true"><span>Request Update</span><span>Coming soon</span></span>
          </div>
        </div>
      </section>
    </div> : null}
  </>
}
