'use client'

import { useState } from 'react'
import Image from 'next/image'
import { HOME_MATERIALS } from '@/lib/landing/homepage-content'
import styles from './landing-page.module.css'

export function LandingMaterials() {
  const [selected, setSelected] = useState<(typeof HOME_MATERIALS)[number]>(HOME_MATERIALS[6])
  const [name, setName] = useState('Nikhil Rakesh')

  return <div className={styles.materialExplorer}>
    <div className={styles.materialPreview}>
      <div className={`${styles.sampleCard} ${selected.light ? styles.sampleCardLight : ''}`}>
        <Image src={`/customize/surfaces/v2/${selected.key}.webp`} alt="" width={1000} height={630} sizes="(max-width: 760px) 85vw, 40vw" />
        <span className={styles.cardMark}>iq</span><strong>{name.trim() || 'Your name'}</strong>
      </div>
      <p aria-live="polite"><strong>{selected.name}</strong><span>{selected.description}</span></p>
    </div>
    <fieldset className={styles.materialChoices}><legend>Explore the finishes</legend><div>{HOME_MATERIALS.map(material => <button type="button" key={material.key} aria-pressed={selected.key === material.key} aria-label={`${material.name} finish`} onClick={() => setSelected(material)} title={material.name}><Image src={`/customize/surfaces/v2/thumbs/${material.key}.webp`} alt="" width={42} height={42} sizes="42px" /><span>{material.name}</span></button>)}</div></fieldset>
    <label className={styles.nameField} htmlFor="card-preview-name"><span>Try your name on it</span><input id="card-preview-name" value={name} onChange={event => setName(event.target.value)} maxLength={28} autoComplete="off" spellCheck={false} placeholder="Your name" /></label>
    <p className={styles.previewNote}>Finish preview. Personalise and save your card in the designer.</p>
  </div>
}
