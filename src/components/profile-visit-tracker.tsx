'use client'
import { useEffect } from 'react'

export function ProfileVisitTracker({ slug, links }: { slug: string; links: { id: string; url: string }[] }) {
  useEffect(() => {
    let visitor: string
    try {
      const key = 'iq-anonymous-visitor-v1'
      visitor = localStorage.getItem(key) || crypto.randomUUID()
      localStorage.setItem(key, visitor)
    } catch { visitor = crypto.randomUUID() }
    function record(event: string, linkId?: string) {
      const body = JSON.stringify({ slug, visitor, event, linkId })
      void fetch('/api/profile-visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {})
    }
    function view() { if (document.visibilityState === 'visible') { record('profile_view'); document.removeEventListener('visibilitychange', view) } }
    function click(e: MouseEvent) {
      const anchor = e.target instanceof Element ? e.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.pathname === '/api/contact/' + slug && anchor.origin === location.origin) { record('contact_save'); return }
      const link = links.find(l => { try { return new URL(l.url).href === anchor.href } catch { return false } })
      if (link) record('link_click', link.id)
    }
    view()
    document.addEventListener('visibilitychange', view)
    document.addEventListener('click', click, true)
    return () => { document.removeEventListener('visibilitychange', view); document.removeEventListener('click', click, true) }
  }, [slug, links])
  return null
}
