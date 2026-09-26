import { AdminDashboard, type AdminDashboardActions } from '@/features/admin/AdminDashboard'
import Link from 'next/link'
import type { OnboardInput } from '@/features/admin/components/AddClientPanel'
import { requireAdminAccount } from '@/lib/auth/account'
import { listAdminClients } from '@/lib/admin/repository'
import { adminActionMessage } from '@/lib/admin/messages'
import { onboardClient, resendClientInvite, setClientPublicationForClient, updateClientSegment } from '@/app/actions/admin'

export const dynamic = 'force-dynamic'

type AdminPageProps = {
  searchParams: Promise<{ error?: string }>
}

function actionFormData(values: Record<string, string>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) formData.set(key, value)
  return formData
}

async function onboardDashboardClient(input: OnboardInput) {
  'use server'
  await onboardClient(actionFormData({ email: input.email, full_name: input.name, segment: input.segment }))
}

async function publishDashboardClient(clientId: string) {
  'use server'
  await setClientPublicationForClient(actionFormData({ client_id: clientId, status: 'published' }))
}

async function unpublishDashboardClient(clientId: string) {
  'use server'
  await setClientPublicationForClient(actionFormData({ client_id: clientId, status: 'draft' }))
}

async function resendDashboardClient(clientId: string) {
  'use server'
  await resendClientInvite(actionFormData({ client_id: clientId }))
}

async function updateDashboardClientSegment(clientId: string, segment: string) {
  'use server'
  await updateClientSegment(actionFormData({ client_id: clientId, segment }))
}

const actions: AdminDashboardActions = {
  onOnboard: onboardDashboardClient,
  onPublish: publishDashboardClient,
  onUnpublish: unpublishDashboardClient,
  onResend: resendDashboardClient,
  onSegmentChange: updateDashboardClientSegment,
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams
  await requireAdminAccount()
  const clients = await listAdminClients()

  return <><Link href="/admin/gifts/new" className="admin-gift-shortcut">＋ Gift</Link><AdminDashboard clients={clients} actions={actions} initialNotice={adminActionMessage(params.error) ?? ''} /></>
}
