'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight, FiMaximize2, FiX, FiPause, FiPlay } from 'react-icons/fi'
import styles from './landing-page.module.css'

const profiles = ['theo', 'leela', 'maya', 'jordan', 'sofia', 'aria'] as const

export function ProfileVibes() {
  const track = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const zoom = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) setPlaying(false)
    const change = (event: MediaQueryListEvent) => { if (event.matches) setPlaying(false) }
    media.addEventListener('change', change)
    const onVisibility = () => setPageVisible(document.visibilityState === 'visible')
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    const el = track.current
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .3 })
    if (el) observer.observe(el)
    return () => { observer.disconnect(); media.removeEventListener('change', change); document.removeEventListener('visibilitychange', onVisibility) }
  }, [])

  useEffect(() => {
    if (!playing || hovered || !visible || zoomed || !pageVisible) return
    const timer = window.setTimeout(() => {
      show((active + 1) % profiles.length)
    }, 6000)
    return () => window.clearTimeout(timer)
  }, [active, playing, hovered, visible, zoomed, pageVisible])

  function show(index: number) {
    const next = Math.max(0, Math.min(profiles.length - 1, index))
    const el = track.current
    if (!el) return
    el.scrollTo({ left: next * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
    setActive(next)
  }

  return (
    <section className={styles.vibesSection} aria-label="Explore example profile designs" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={event => { if (!(event.target as HTMLElement).closest('[data-playback]')) setPlaying(false) }}>
      <div className={styles.vibesTrack} ref={track} tabIndex={0} aria-label="Swipe to explore six example profiles" onTouchStart={() => setPlaying(false)}
        onScroll={event => { const el = event.currentTarget; if (el.clientWidth) setActive(Math.round(el.scrollLeft / el.clientWidth)) }}>
        {profiles.map(name => <div className={styles.vibesSlide} key={name}>
          <Image src={`/homepage/vibes/${name}.webp`} alt={`Illustrative ${name} profile and its surrounding creative world`} width={2016} height={781} sizes="100vw" unoptimized />
        </div>)}
      </div>
      <div className={styles.vibesControls}>
        <button type="button" data-playback className={styles.vibesPlayback} onClick={() => setPlaying(value => !value)} aria-label={playing ? 'Pause automatic slideshow' : 'Play automatic slideshow'}>{playing ? <FiPause /> : <FiPlay />}</button>
        <button type="button" className={styles.vibesArrow} aria-label="Previous profile" onClick={() => show(active - 1)} disabled={active === 0}><FiChevronLeft /></button>
        <nav className={styles.vibesNavigation} aria-label="Choose a profile image">
          {profiles.map((name, index) => <button type="button" key={name} onClick={() => show(index)} aria-label={`View profile ${index + 1}: ${name}`} aria-current={active === index ? 'true' : undefined} />)}
        </nav>
        <button type="button" className={styles.vibesArrow} aria-label="Next profile" onClick={() => show(active + 1)} disabled={active === profiles.length - 1}><FiChevronRight /></button>
        <button type="button" className={styles.vibesExpand} onClick={() => { dialog.current?.showModal(); setZoomed(true); requestAnimationFrame(() => { if (zoom.current) zoom.current.scrollLeft = (zoom.current.scrollWidth - zoom.current.clientWidth) / 2 }) }} aria-label="View current profile larger"><FiMaximize2 /><span>View larger</span></button>
      </div>
      <dialog className={styles.vibesDialog} ref={dialog} onClose={() => setZoomed(false)} aria-label="Larger profile image">
        <button type="button" className={styles.vibesClose} onClick={() => dialog.current?.close()} aria-label="Close larger image"><FiX /></button>
        <div className={styles.vibesZoom} ref={zoom} tabIndex={0} aria-label="Pan to explore the enlarged image"><Image src={`/homepage/vibes/${profiles[active]}.webp`} alt={`Illustrative ${profiles[active]} profile and its surrounding creative world`} width={2016} height={781} sizes="100vw" unoptimized /></div>
      </dialog>
    </section>
  )
}
