export const HOME_CTA_HREF = '/customize'

export const HOME_SECTION_IDS = [
  'how-it-works',
  'iq-customize-tease',
  'iq-identity-receive',
] as const

export const HOME_NAV_ITEMS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'The card', href: '#iq-customize-tease' },
  { label: 'Your profile', href: '#iq-identity-receive' },
] as const

export const HOME_MATERIALS = [
  { key: 'white', name: 'White', description: 'Clean. Simple. A fresh start.', light: true },
  { key: 'black', name: 'Black', description: 'Quiet confidence. A timeless finish.', light: false },
  { key: 'graphite', name: 'Graphite', description: 'Soft charcoal. Understated character.', light: false },
  { key: 'terracotta', name: 'Terracotta', description: 'Earthy warmth. A little unexpected.', light: false },
  { key: 'mustard', name: 'Mustard', description: 'A warm colour with a point of view.', light: true },
  { key: 'oxblood', name: 'Oxblood', description: 'Deep red. Distinctly personal.', light: false },
  { key: 'walnut', name: 'Walnut', description: 'A warm, wood-inspired finish.', light: false },
  { key: 'natural-oak', name: 'Natural Oak', description: 'Light grain. An easy warmth.', light: true },
  { key: 'travertine', name: 'Travertine', description: 'A quiet, stone-inspired texture.', light: true },
  { key: 'concrete', name: 'Concrete', description: 'Architectural grey. Softly textured.', light: true },
  { key: 'ivory-marble', name: 'Ivory Marble', description: 'Pale ivory with natural-inspired veining.', light: true },
  { key: 'oxidised-steel', name: 'Oxidised Steel', description: 'An industrial, weathered-metal look.', light: false },
] as const

export const HOME_FAQS = [
  { question: 'What exactly is IQ Card?', answer: 'IQ Card is a personalised physical NFC business card connected to your digital profile. Share your contact details, website, portfolio and social links with one introduction.' },
  { question: 'Does the other person need an app?', answer: 'No app is needed to view your profile. On a compatible phone, they tap the card and open the notification in their browser. They can also open your personal profile link.' },
  { question: 'Will it work with their phone?', answer: 'Tapping requires a compatible NFC-enabled iPhone or Android phone, and NFC may need to be enabled. Reader position varies by phone. If tapping is unavailable, share your personal profile link. An internet connection is needed to load the profile.' },
  { question: 'Can I change my details later?', answer: 'Yes. Sign in to your dashboard to edit your digital profile and publish your updates. The same profile link continues to open your updated information, so you do not need a new card when your details change.' },
  { question: 'What is included with my card?', answer: 'Your personalised NFC card and its digital profile are included in the card price. Review the final order and any applicable delivery charges at checkout.' },
  { question: 'Is the card made from wood or stone?', answer: 'Names such as Walnut, Travertine and Concrete describe the card’s surface finish and visual texture. They do not mean the card is made from solid wood or stone.' },
  { question: 'How do I get started?', answer: 'Open the card designer, choose your finish and add your name. Continue through account setup and create your digital profile, then follow the checkout steps to place your order.' },
] as const
