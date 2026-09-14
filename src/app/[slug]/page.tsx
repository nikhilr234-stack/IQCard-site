import { notFound } from 'next/navigation'
import { getPublishedProfile } from '@/lib/profile/repository'
import { PublicProfileCard } from '@/components/public-profile-card'
export const dynamic = 'force-dynamic'
export default async function ProfilePage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const profile = await getPublishedProfile(slug); if (!profile) notFound(); return <PublicProfileCard profile={profile} /> }
