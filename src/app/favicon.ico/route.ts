const favicon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="IQ Card">
  <rect width="64" height="64" rx="16" fill="#111113"/>
  <circle cx="49" cy="15" r="5" fill="#ff4f9a"/>
  <text x="10" y="46" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" letter-spacing="-4">iq</text>
</svg>
`.trim()

export function GET() {
  return new Response(favicon, {
    headers: {
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'Content-Type': 'image/svg+xml; charset=utf-8',
    },
  })
}
