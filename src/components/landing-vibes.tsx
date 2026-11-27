'use client'

import { useState } from 'react'
import styles from './landing-page.module.css'

const vibes = [
  { name: 'Theo', role: 'Product designer', mood: 'THE FUTURE IS PERSONAL', theme: 'future', image: '/homepage/vibes/theo.webp' },
  { name: 'Leela', role: 'Ceramic artist', mood: 'MADE BY HAND', theme: 'earth', image: '/homepage/vibes/leela.webp' },
  { name: 'Maya', role: 'Creative curator', mood: 'QUIETLY DISTINCT', theme: 'gallery', image: '/homepage/vibes/maya.webp' },
  { name: 'Jordan', role: 'Outdoor guide', mood: 'MADE TO EXPLORE', theme: 'alpine', image: '/homepage/vibes/jordan.webp' },
  { name: 'Sofia', role: 'Chef & storyteller', mood: 'FULL OF FLAVOUR', theme: 'food', image: '/homepage/vibes/sofia.webp' },
  { name: 'Aria', role: 'Music producer', mood: 'FEEL EVERY NOTE', theme: 'music', image: '/homepage/vibes/aria.webp' },
] as const

function VibeCard({ vibe, index }: { vibe: typeof vibes[number]; index: number }) {
  const [imageFailed, setImageFailed] = useState(false)

  return <article className={`${styles.vibeCard} ${styles[`vibe${vibe.theme}`]}`}>
    {!imageFailed && <img src={vibe.image} alt={`Illustrative profile world for ${vibe.name}, ${vibe.role}`} loading="lazy" width="2016" height="780" onError={() => setImageFailed(true)} />}
    {imageFailed && <div className={styles.vibeFallback} aria-hidden="true"><span>iq</span><div className={styles.vibeFallbackPhone}><small>iq / PROFILE</small><strong>{vibe.name}</strong><em>{vibe.role}</em><i>Explore their world ↗</i></div></div>}
    <div className={styles.vibeCaption}>
      <div><span>0{index + 1} / A DIFFERENT WORLD</span><h3>{vibe.name}<small>{vibe.role}</small></h3></div>
      <p>{vibe.mood}</p>
    </div>
  </article>
}

export function LandingVibes() {
  return <section id="iq-profile-vibes" className={styles.vibesSection} aria-labelledby="vibes-heading">
    <div className={styles.container}>
      <div className={styles.vibesIntro}>
        <p className={styles.vibesEyebrow}><span aria-hidden="true" /> ONE TAP. MANY WORLDS.</p>
        <h2 id="vibes-heading">A tap can show off their vibe.<br /><span>Each profile tells a different story.</span></h2>
        <p>From the studio to the stage, from the mountains to the makers. A profile can be more than a list of links — it can feel like the person behind it.</p>
      </div>
    </div>
    <div className={styles.vibesTrack} aria-label="Six illustrative IQ profile worlds">
      {vibes.map((vibe, i) => <VibeCard key={vibe.name} vibe={vibe} index={i} />)}
    </div>
    <div className={`${styles.container} ${styles.vibesOutro}`}><span>DIFFERENT PEOPLE. DIFFERENT STORIES. ONE IQ.</span><span>SWIPE TO EXPLORE <b aria-hidden="true">→</b></span></div>
  </section>
}
