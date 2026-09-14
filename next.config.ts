import type { NextConfig } from 'next'
import { legacyRouteRedirects } from './src/lib/site-routing'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  async redirects() {
    return legacyRouteRedirects
  },
  async rewrites() {
    return [
      { source: '/customize', destination: '/customize/index.html' },
      { source: '/customize/', destination: '/customize/index.html' },
    ]
  },
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }] }]
  },
}

export default nextConfig
