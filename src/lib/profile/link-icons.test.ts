import { describe, expect, it } from 'vitest'

import { getLinkIcon } from './link-icons'

describe('profile link icon resolution', () => {
  it('recognizes supported brands by label', () => {
    const labels = ['LinkedIn', 'Instagram', 'X', 'Facebook', 'YouTube', 'GitHub', 'Behance', 'Dribbble', 'Pinterest', 'TikTok', 'Spotify', 'Apple Music', 'WhatsApp', 'Email', 'Phone', 'Website', 'Portfolio', 'Medium', 'Substack']
    for (const label of labels) expect(getLinkIcon(label, '').key).not.toBe('external')
    expect(getLinkIcon('Apple Music', '').key).toBe('applemusic')
  })

  it('recognizes icons by hostname and contact protocol', () => {
    expect(getLinkIcon('My profile', 'https://www.github.com/ada')?.key).toBe('github')
    expect(getLinkIcon('Contact', 'mailto:ada@example.com')?.key).toBe('email')
    expect(getLinkIcon('Call', 'tel:+123456789')?.key).toBe('phone')
  })

  it('uses a generic external-link icon for unknown destinations', () => {
    expect(getLinkIcon('My page', 'https://example.com')?.key).toBe('external')
    expect(getLinkIcon('', '')?.key).toBe('external')
  })
})
