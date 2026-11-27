'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiMaximize2, FiX } from 'react-icons/fi'
import styles from './landing-page.module.css'

const profiles = ['theo', 'leela', 'maya', 'jordan', 'sofia', 'aria'] as const

export function ProfileVibes() {
  const track = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const zoom = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  function show(index: number) {
    const next = Math.max(0, Math.min(profiles.length - 1, index))
    const el = track.current
    if (!el) return
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    setActive(next)
  }

  return (
    <section className={styles.vibesSection} aria-label="Explore example profile designs">
      <div className={styles.vibesTrack} ref={track} tabIndex={0} aria-label="Swipe to explore six example profiles"
        onScroll={event => { const el = event.currentTarget; if (el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth)) }}>
        {profiles.map(name => <div className={styles.vibesSlide} key={name}>
          <Image src={`/homepage/vibes/${name}.webp`} alt={`Illustrative ${name} profile and its surrounding creative world`} width={2016} height={781} sizes="100vw" unoptimized />
        </div>)}
      </div>
      <div className={styles.vibesControls}>
        <button type="button" className={styles.vibesArrow} aria-label="Previous profile" onClick={() => show(active - 1)} disabled={active === 0}><FiChevronLeft /></button>
        <nav className={styles.vibesNavigation} aria-label="Choose a profile image">
          {profiles.map((name, index) => <button type="button" key={name} onClick={() => show(index)} aria-label={`View profile ${index + 1}: ${name}`} aria-current={active === index ? 'true' : undefined} />)}
        </nav>
        <button type="button" className={styles.vibesArrow} aria-label="Next profile" onClick={() => show(active + 1)} disabled={active === profiles.length - 1}><FiChevronRight /></button>
        <button type="button" className={styles.vibesExpand} onClick={() => { dialog.current?.showModal(); requestAnimationFrame(() => { if (zoom.current) zoom.current.scrollLeft = (zoom.current.scrollWidth - zoom.current.clientWidth) / 2 }) }} aria-label="View current profile larger"><FiMaximize2 /><span>View larger</span></button>
      </div>
      <dialog className={styles.vibesDialog} ref={dialog} aria-label="Larger profile image">
        <button type="button" className={styles.vibesClose} onClick={() => dialog.current?.close()} aria-label="Close larger image"><FiX /></button>
        <div className={styles.vibesZoom} ref={zoom} tabIndex={0} aria-label="Pan to explore the enlarged image"><Image src={`/homepage/vibes/${profiles[active]}.webp`} alt={`Illustrative ${profiles[active]} profile and its surrounding creative world`} width={2016} height={781} sizes="100vw" unoptimized /></div>
      </dialog>
    </section>
  )
}
