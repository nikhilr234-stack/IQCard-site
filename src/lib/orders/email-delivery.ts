import { createAdminClient } from '@/lib/supabase/admin'

type BatchResult = { outcome: 'processed' | 'disabled'; sent: number; retried: number; failed: number }

export async function deliverOrderEmailBatch(limit = 5): Promise<BatchResult> {
  if (process.env.IQCARD_ORDER_EMAILS_ENABLED !== 'true' || !process.env.RESEND_API_KEY?.trim() || !process.env.IQCARD_ORDER_EMAIL_FROM?.trim()) {
    return { outcome: 'disabled', sent: 0, retried: 0, failed: 0 }
  }
  const safeLimit = Math.min(10, Math.max(1, Math.floor(limit)))
  const { data, error } = await createAdminClient().rpc('claim_paid_order_email_batch', { p_batch_size: safeLimit })
  if (error) throw new Error('Unable to load order email queue')
  let sent = 0, retried = 0, failed = 0
  for (const item of (Array.isArray(data) ? data : []) as Array<{ id: string; recipient: string; subject: string; body_text: string; order_id: string; attempts: number; claim_token: string }>) {
    let delivered = false
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
          'content-type': 'application/json',
          'Idempotency-Key': `order-email/${item.id}`,
        },
        body: JSON.stringify({ from: process.env.IQCARD_ORDER_EMAIL_FROM!.trim(), to: [item.recipient], subject: item.subject, text: item.body_text }),
        signal: AbortSignal.timeout(8_000), cache: 'no-store',
      })
      if (!response.ok) throw new Error('Email provider rejected message')
      delivered = true
    } catch {
      delivered = false
    }

    let completionRecorded = false
    try {
      const { data: completed, error } = await createAdminClient().rpc('complete_paid_order_email', {
        p_email_id: item.id, p_claim_token: item.claim_token, p_success: delivered,
        p_error: delivered ? null : 'delivery_failed',
      })
      completionRecorded = !error && completed === true
    } catch {
      completionRecorded = false
    }

    if (!completionRecorded) {
      failed++
    } else if (delivered) {
      sent++
    } else if (item.attempts < 5) {
      retried++
    } else {
      failed++
    }
  }
  return { outcome: 'processed', sent, retried, failed }
}
