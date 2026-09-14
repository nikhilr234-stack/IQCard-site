import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing-page'

export const metadata: Metadata = {
  title: 'IQ Card — An introduction, redesigned.',
  description: 'IQ Card — a physical identity object that opens your digital profile in one tap.',
}

export default function HomePage() {
  return <LandingPage />
}
