'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { LuGlobe } from 'react-icons/lu'
import { getWebsitePreviewTarget, loadWebsitePreview, type WebsitePreviewData } from '@/lib/profile/website-preview'
import styles from './website-preview-card.module.css'

export function WebsitePreviewCard({ label, url }: { label: string; url: string }) {
  const anchor = useRef<HTMLAnchorElement>(null)
  const target = getWebsitePreviewTarget(url)
  const [loaded, setLoaded] = useState<{ target: string; data: WebsitePreviewData | null } | null>(null)
  const [loadingTarget, setLoadingTarget] = useState<string | null>(null)
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const data = loaded?.target === target ? loaded.data : null
  const image = data?.screenshotUrl && data.screenshotUrl !== failedImage ? data.screenshotUrl : null
  const domain = target ? new URL(target).hostname.replace(/^www\./, '') : ''

  useEffect(() => {
    if (!target || !anchor.current || typeof IntersectionObserver === 'undefined') return
    let active = true
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      setLoadingTarget(target)
      void loadWebsitePreview(target).then((result) => {
        if (!active) return
        setLoaded({ target, data: result })
        setLoadingTarget(null)
      })
    }, { rootMargin: '80px 0px' })
    observer.observe(anchor.current)
    return () => { active = false; observer.disconnect() }
  }, [target])

  if (!target) return null
  return <a ref={anchor} className={styles.card} href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label || domain} — ${domain}, opens in a new tab`}>
    <div className={styles.visual} aria-busy={loadingTarget === target}>
      {image ? <Image src={image} alt={`Homepage preview of ${domain}`} width={1280} height={720} unoptimized loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedImage(image)} /> : <div className={styles.placeholder} role="img" aria-label={`Homepage preview of ${domain}`}>
        <LuGlobe aria-hidden="true" />
        <span>{domain}</span>
        {loadingTarget === target ? <small>Loading preview…</small> : null}
      </div>}
    </div>
    <div className={styles.copy}>
      <div className={styles.eyebrow}><span>{label || 'Website'}</span><span aria-hidden="true">↗</span></div>
      <strong>{data?.title || domain}</strong>
      {data?.description ? <p>{data.description}</p> : null}
      <small>{domain}</small>
    </div>
  </a>
}
