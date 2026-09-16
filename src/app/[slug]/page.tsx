import { notFound } from 'next/navigation'
import { PublicProfile } from '@/components/public-profile'
import { getPublishedProfile, getPublishedProfilePresentationBySlug } from '@/lib/profile/repository'
export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [profile, presentation] = await Promise.all([
    getPublishedProfile(slug),
    getPublishedProfilePresentationBySlug(slug),
  ])
  if (!profile) notFound()

  return <PublicProfile profile={profile} presentation={presentation} />
}
