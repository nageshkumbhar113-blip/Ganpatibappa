import { createAdminClient } from '@/lib/supabase/admin'

export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled'

export interface ShopSubscriptionInfo {
  shopId: string
  planName: 'trial' | 'basic' | 'premium'
  status: SubscriptionStatus
  expiresAt: string
  daysLeft: number
  isExpired: boolean
  isSuspended: boolean
  needsRenewalReminder: boolean // within 7 days
}

/** Fetch subscription info for one shop. */
export async function getShopSubscription(shopId: string): Promise<ShopSubscriptionInfo | null> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('shop_subscriptions')
    .select('status, expires_at, subscription_plans(name)')
    .eq('shop_id', shopId)
    .single()

  if (!data) return null

  const expiresAt = data.expires_at
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
  const planName = (data.subscription_plans as { name: string } | null)?.name ?? 'trial'

  return {
    shopId,
    planName: planName as ShopSubscriptionInfo['planName'],
    status: data.status as SubscriptionStatus,
    expiresAt,
    daysLeft,
    isExpired: daysLeft <= 0 || data.status === 'expired',
    isSuspended: data.status === 'suspended',
    needsRenewalReminder: daysLeft > 0 && daysLeft <= 7,
  }
}

/** Suspend all shops whose subscription has expired.
 *  Called by a daily cron job (api/cron/check-subscriptions). */
export async function suspendExpiredShops(): Promise<number> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  // Mark subscriptions as expired
  const { data: expiredSubs } = await supabase
    .from('shop_subscriptions')
    .update({ status: 'expired' })
    .in('status', ['trial', 'active'])
    .lt('expires_at', now)
    .select('shop_id')

  if (!expiredSubs?.length) return 0

  const shopIds = expiredSubs.map((s) => s.shop_id)

  // Suspend those shops
  await supabase.from('shops').update({ status: 'suspended' }).in('id', shopIds)

  return shopIds.length
}

/** Reactivate a shop after payment is received. */
export async function reactivateShop(shopId: string, newExpiresAt: string): Promise<void> {
  const supabase = createAdminClient()

  await Promise.all([
    supabase
      .from('shop_subscriptions')
      .update({ status: 'active', expires_at: newExpiresAt })
      .eq('shop_id', shopId),
    supabase.from('shops').update({ status: 'active' }).eq('id', shopId),
  ])
}

/** Get shops that need renewal reminders (7 / 3 / 1 days before expiry). */
export async function getShopsNeedingRenewalReminder(): Promise<
  Array<{ shopId: string; shopName: string; ownerEmail: string; daysLeft: number }>
> {
  const supabase = createAdminClient()

  const reminderDays = [7, 3, 1]
  const results = []

  for (const days of reminderDays) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)
    const start = new Date(targetDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(targetDate)
    end.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from('shop_subscriptions')
      .select(
        `shop_id, shops(name), users!shops(email)`
      )
      .in('status', ['trial', 'active'])
      .gte('expires_at', start.toISOString())
      .lte('expires_at', end.toISOString())
      .eq('renewal_reminder_sent', false)

    if (data) {
      for (const row of data) {
        const shop = row.shops as { name: string } | null
        const owner = (row.users as { email: string }[] | null)?.[0]
        if (shop && owner) {
          results.push({
            shopId: row.shop_id,
            shopName: shop.name,
            ownerEmail: owner.email,
            daysLeft: days,
          })
        }
      }
    }
  }

  return results
}
