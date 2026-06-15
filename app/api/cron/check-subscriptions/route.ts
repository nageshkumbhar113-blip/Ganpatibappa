import { NextRequest, NextResponse } from 'next/server'
import { suspendExpiredShops, getShopsNeedingRenewalReminder } from '@/lib/utils/subscription-checker'
import { createAdminClient } from '@/lib/supabase/admin'

// Called daily by Vercel Cron: 0 2 * * * (2 AM UTC)
// Secured by CRON_SECRET header
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = {
    suspended: 0,
    reminders: 0,
    errors: [] as string[],
  }

  try {
    // 1. Suspend expired shops
    results.suspended = await suspendExpiredShops()

    // 2. Send renewal reminders
    const shopsDue = await getShopsNeedingRenewalReminder()
    const supabase = createAdminClient()

    for (const shop of shopsDue) {
      try {
        // Mark reminder sent
        await supabase
          .from('shop_subscriptions')
          .update({ renewal_reminder_sent: true })
          .eq('shop_id', shop.shopId)

        // TODO: send email via Resend
        // await sendRenewalReminderEmail(shop)

        // Create notification in DB
        await supabase.from('notifications').insert({
          shop_id: shop.shopId,
          title: 'Subscription Expiry Reminder',
          body: `Your subscription expires in ${shop.daysLeft} day(s). Please renew to avoid service interruption.`,
          type: 'system',
          is_read: false,
        })

        results.reminders++
      } catch (err: any) {
        results.errors.push(`Shop ${shop.shopId}: ${err?.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...results,
    })
  } catch (error: any) {
    console.error('[CRON check-subscriptions]', error)
    return NextResponse.json({ error: error?.message ?? 'Cron failed' }, { status: 500 })
  }
}
