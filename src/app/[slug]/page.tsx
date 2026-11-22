import { notFound } from 'next/navigation'
import { PublicProfile } from '@/components/public-profile'
import { getPublishedProfile, getPublishedProfilePresentationBySlug } from '@/lib/profile/repository'
export const revalidate = 60

// Generate each public URL on its first visit, then serve the rendered page
// from the route cache. Without this, an unlisted slug stays dynamic even
// though its database reads are cached. New slugs remain available on demand.
export function generateStaticParams() {
  return []
}

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [profile, presentation] = await Promise.all([
    getPublishedProfile(slug),
    getPublishedProfilePresentationBySlug(slug),
  ])
  if (!profile) notFound()

  return <PublicProfile profile={profile} presentation={presentation} />
}
