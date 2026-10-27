import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing-page'

export const metadata: Metadata = {
  title: 'IQ Card — Your NFC business card. One tap. Everything shared.',
  description: 'A personalised NFC business card that opens your contact details, portfolio and social links on someone’s phone. Design your IQ Card for ₹799.',
}

export default function HomePage() {
  return <LandingPage />
}
