import { isValidProfileLinkUrl } from '@/lib/profile/validation'
import type { WhatsNextItem } from '@/lib/profile/types'

export function ProfileWhatsNext({ items, className = '' }: { items: WhatsNextItem[]; className?: string }) {
  if (!items.length) return null

  return <section className={`profile-whats-next ${className}`.trim()} aria-label="What’s next" data-whats-next>
    <h2>What’s next</h2>
    <div className="profile-whats-next-list">
      {items.map((item, index) => <article className="profile-whats-next-item" data-whats-next-item key={`${item.title}-${index}`}>
        {item.date ? <span className="profile-whats-next-date">{item.date}</span> : null}
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        {item.url && isValidProfileLinkUrl(item.url) ? <a href={item.url} target={/^https?:\/\//i.test(item.url) ? '_blank' : undefined} rel={/^https?:\/\//i.test(item.url) ? 'noopener noreferrer' : undefined}>Learn more<span aria-hidden="true">↗</span></a> : null}
      </article>)}
    </div>
  </section>
}
