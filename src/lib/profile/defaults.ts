import { isReservedSlug, suggestSlug } from './validation'
export function createDefaultProfileDraft(fullName: string, email: string, slugSeed = fullName) {
  const root = suggestSlug(slugSeed) || 'profile'
  return {
    slug: isReservedSlug(root) ? `${root}-2` : root,
    full_name: fullName,
    email,
    headline: '',
    tagline: '',
    bio: '',
    phone: '',
    whatsapp: '',
    location: '',
    public_email_visible: false,
    phone_visible: false,
    whatsapp_visible: false,
    location_visible: false,
    status: 'draft' as const,
  }
}
