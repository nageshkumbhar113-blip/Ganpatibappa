import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET() {
  await requireSuperAdmin()
  const supabase = createAdminClient()

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalShops },
    { count: activeShops },
    { count: trialShops },
    { count: expiredShops },
    { count: totalCustomers },
    { count: newShopsThisMonth },
  ] = await Promise.all([
    supabase.from('shops').select('*', { count: 'exact', head: true }).neq('status', 'deleted'),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('shop_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trial'),
    supabase
      .from('shop_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired'),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer'),
    supabase
      .from('shops')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo)
      .neq('status', 'deleted'),
  ])

  // Recent shops
  const { data: recentShops } = await supabase
    .from('shops')
    .select(`
      id, name, slug, status, created_at,
      shop_subscriptions(status, expires_at, subscription_plans(name))
    `)
    .neq('status', 'deleted')
    .order('created_at', { ascending: false })
    .limit(5)

  return NextResponse.json({
    stats: {
      totalShops: totalShops ?? 0,
      activeShops: activeShops ?? 0,
      trialShops: trialShops ?? 0,
      expiredShops: expiredShops ?? 0,
      totalCustomers: totalCustomers ?? 0,
      newShopsThisMonth: newShopsThisMonth ?? 0,
    },
    recentShops: recentShops ?? [],
  })
}
