import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminAccount } from '@/lib/auth/account'
import { createAdminClient } from '@/lib/supabase/admin'
import { GiftDetailsForm } from '@/features/admin/gifts/GiftDetailsForm'

export const dynamic = 'force-dynamic'

export default async function EditGiftPage({ params }: { params: Promise<{ profileId: string }> }) {
  await requireAdminAccount()
  const { profileId } = await params
  const admin = createAdminClient()
  const { data, error } = await admin.from('profiles').select('id,owner_id,full_name,headline,tagline,phone,whatsapp,location,profile_links(label,url)').eq('id', profileId).maybeSingle()
  if (error || !data || data.owner_id !== null) notFound()
  const links = Array.isArray(data.profile_links) ? data.profile_links as Array<{ label: string; url: string }> : []
  const get = (label: string) => links.find(link => link.label.toLowerCase() === label.toLowerCase())?.url ?? ''
  return <main className="gift-page"><Link href="/admin">← Admin</Link><h1>Add gift details</h1><p>Changes publish immediately. Existing gift media and claim information stay private.</p><GiftDetailsForm details={{ profileId: data.id, fullName: data.full_name, role: data.headline, tagline: data.tagline, phone: data.phone, whatsapp: data.whatsapp, location: data.location, linkedin: get('LinkedIn'), instagram: get('Instagram'), website: get('Website') }} /></main>
}
