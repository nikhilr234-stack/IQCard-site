import { NextResponse } from 'next/server'
import { deliverOrderEmailBatch } from '@/lib/orders/email-delivery'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, code: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }
  if (process.env.IQCARD_ORDER_EMAILS_ENABLED !== 'true' || !process.env.RESEND_API_KEY?.trim() ||
    !process.env.IQCARD_ORDER_EMAIL_FROM?.trim() || !process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return NextResponse.json({ ok: true, outcome: 'disabled' }, { headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    return NextResponse.json({ ok: true, ...(await deliverOrderEmailBatch(5)) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, code: 'email-delivery-unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
