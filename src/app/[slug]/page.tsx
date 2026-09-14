import { notFound } from 'next/navigation'
import { PublicProfile } from '@/components/public-profile'
import { getPublishedProfile, getPublishedProfilePresentation } from '@/lib/profile/repository'
export const dynamic = 'force-dynamic'

export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const profile = await getPublishedProfile(slug)
  if (!profile) notFound()
  const presentation = await getPublishedProfilePresentation(profile.id)

  return <PublicProfile profile={profile} presentation={presentation} />
}
