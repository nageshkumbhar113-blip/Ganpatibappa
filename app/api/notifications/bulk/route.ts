import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { sendBulkPushNotifications } from '@/lib/firebase/admin'
import { z } from 'zod'

const BulkNotifSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  target: z.enum(['all', 'customers', 'admins']),
  url: z.string().url().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin()

    const hasBulkNotif = await checkFeature(user.shop_id!, 'bulk_notifications')
    if (!hasBulkNotif) {
      return NextResponse.json(
        { error: 'Bulk notifications require Premium plan.' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const parsed = BulkNotifSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
    }

    const { title, body: notifBody, target, url } = parsed.data
    const supabase = createAdminClient()

    // Fetch target FCM tokens
    let query = supabase
      .from('fcm_subscriptions')
      .select('fcm_token')
      .eq('shop_id', user.shop_id!)

    if (target === 'customers') query = query.eq('role', 'customer')
    if (target === 'admins') query = query.in('role', ['admin', 'staff'])

    const { data: subscriptions } = await query
    const tokens = (subscriptions ?? []).map((s) => s.fcm_token)

    if (tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No subscribers found for this target.' })
    }

    const result = await sendBulkPushNotifications(tokens, title, notifBody, url ? { url } : undefined)

    // Remove invalid tokens
    if (result.invalidTokens.length > 0) {
      await supabase
        .from('fcm_subscriptions')
        .delete()
        .in('fcm_token', result.invalidTokens)
    }

    // Log notification in DB
    await supabase.from('notifications').insert({
      shop_id: user.shop_id!,
      title,
      body: notifBody,
      type: 'bulk',
      is_read: false,
    })

    return NextResponse.json({
      sent: result.successCount,
      failed: result.failureCount,
      total: tokens.length,
    })
  } catch (error: any) {
    console.error('[POST /api/notifications/bulk]', error)
    return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 })
  }
}
