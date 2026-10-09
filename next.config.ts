import type { NextConfig } from 'next'
import { foundingProfileRewrites, legacyRouteRedirects } from './src/lib/site-routing'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    minimumCacheTTL: 300,
    localPatterns: [
      { pathname: '/api/profile-photo' },
      { pathname: '/api/profile-cover' },
    ],
  },
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
      ...foundingProfileRewrites,
    ]
  },
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'X-Content-Type-Options', value: 'nosniff' }, { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }, { key: 'X-Frame-Options', value: 'DENY' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }] }, { source: '/customize/:path*', headers: [{ key: 'X-Frame-Options', value: 'SAMEORIGIN' }] }]
  },
}

export default nextConfig
