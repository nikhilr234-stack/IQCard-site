export const legacyRouteRedirects = [
  { source: '/iq', destination: '/', permanent: true },
]

export function publicProfileUrl(siteUrl: string, slug: string): string {
  return new URL(`/${slug}`, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).toString()
}
