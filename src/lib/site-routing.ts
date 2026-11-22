export const legacyRouteRedirects = [
  { source: '/iq', destination: '/', permanent: true },
]

// These original public cards predate the account-backed profile system.
// Rohan now uses his published account-backed profile at the same NFC URL.
export const foundingProfileSlugs = [
  'infant', 'aadhya', 'prerna', 'hema', 'sharath', 'mithul', 'naveen',
  'rajesh', 'rakesh', 'ravichandra', 'teju', 'Ashwin',
] as const

export const foundingProfileRewrites = foundingProfileSlugs.flatMap((slug) => [
  { source: `/${slug}`, destination: `/founding-profiles/${slug}/index.html` },
  { source: `/${slug}/:asset`, destination: `/founding-profiles/${slug}/:asset` },
])

export function publicProfileUrl(siteUrl: string, slug: string): string {
  return new URL(`/${slug}`, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString()
}
