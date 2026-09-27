'use client'

import styles from './layout-variant-selector.module.css'
import { PROFILE_TEMPLATE_OPTIONS } from '@/lib/profile/presentation'
import { getTemplateVariants } from '@/lib/profile/template-variants'
import type { ProfileTemplate } from '@/lib/profile/types'

type LayoutVariantSelectorProps = {
  template: ProfileTemplate
  value: string
  onChange: (variant: string) => void
}

export function LayoutVariantSelector({ template, value, onChange }: LayoutVariantSelectorProps) {
  const templateName = PROFILE_TEMPLATE_OPTIONS.find((option) => option.id === template)?.name ?? template

  return <section className={styles.section} aria-labelledby="digital-profile-layout-title">
    <div className={styles.heading}>
      <div><span>02 · LAYOUT</span><h2 id="digital-profile-layout-title">Choose the composition.</h2><p>{templateName} layout variants</p></div>
    </div>
    <div className={styles.grid} role="group" aria-label={`${templateName} layout variants`}>
      {getTemplateVariants(template).map((variant) => <button
        key={variant.id}
        type="button"
        className={`${styles.card}${value === variant.id ? ` ${styles.active}` : ''}`}
        aria-label={`${templateName} layout: ${variant.label}. ${variant.description}`}
        aria-pressed={value === variant.id}
        onClick={() => onChange(variant.id)}
      >
        <span className={styles.thumbnail} data-template={template} data-layout={variant.thumbnail} aria-hidden="true">
          <i className={styles.media} />
          <i className={styles.identity} />
          <i className={styles.content} />
          <i className={styles.links} />
        </span>
        <span className={styles.copy}><strong>{variant.label}</strong><small>{variant.description}</small></span>
      </button>)}
    </div>
  </section>
}
