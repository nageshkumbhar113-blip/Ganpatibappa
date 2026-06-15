import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'
import { sendBulkPushNotifications } from '@/lib/firebase/admin'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireAdmin()
  const supabase = createClient()
  const admin = createAdminClient()

  // Load campaign
  const { data: campaign } = await supabase
    .from('festival_campaigns')
    .select('*')
    .eq('id', params.id)
    .eq('shop_id', user.shop_id!)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 409 })

  let sentCount = 0

  // Push notifications
  if (campaign.push_enabled) {
    const { data: subscriptions } = await admin
      .from('fcm_subscriptions')
      .select('fcm_token')
      .eq('shop_id', user.shop_id!)

    const tokens = subscriptions?.map((s: any) => s.fcm_token).filter(Boolean) ?? []
    if (tokens.length > 0) {
      const result = await sendBulkPushNotifications(
        tokens,
        campaign.name,
        campaign.message,
        { campaign_id: params.id }
      )
      sentCount += result.successCount
    }
  }

  // Update campaign status
  await supabase
    .from('festival_campaigns')
    .update({ status: 'sent', sent_count: sentCount })
    .eq('id', params.id)

  return NextResponse.json({ success: true, sentCount })
}
