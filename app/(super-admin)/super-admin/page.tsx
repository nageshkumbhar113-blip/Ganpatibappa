import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperAdmin } from '@/lib/middleware/auth-guard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Store, Users, CreditCard, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'

async function getPlatformStats() {
  const supabase = createAdminClient()

  const [
    { count: totalShops },
    { count: activeShops },
    { count: trialShops },
    { count: expiredShops },
    { count: totalUsers },
    { data: recentShops },
  ] = await Promise.all([
    supabase.from('shops').select('*', { count: 'exact', head: true }),
    supabase.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('shop_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'trial'),
    supabase
      .from('shop_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'expired'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase
      .from('shops')
      .select('id, name, slug, status, created_at, shop_subscriptions(status, expires_at, subscription_plans(display_name))')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  return {
    totalShops: totalShops ?? 0,
    activeShops: activeShops ?? 0,
    trialShops: trialShops ?? 0,
    expiredShops: expiredShops ?? 0,
    totalCustomers: totalUsers ?? 0,
    recentShops: recentShops ?? [],
  }
}

export default async function SuperAdminDashboard() {
  await requireSuperAdmin()
  const stats = await getPlatformStats()

  const statCards = [
    {
      title: 'Total Shops',
      value: stats.totalShops,
      icon: Store,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Active Shops',
      value: stats.activeShops,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      title: 'Trial Shops',
      value: stats.trialShops,
      icon: CreditCard,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      title: 'Total Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">GanpatiBappa SaaS — Admin Overview</p>
        </div>
        <Link
          href="/super-admin/shops/create"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <Store className="h-4 w-4" />
          Create New Shop
        </Link>
      </div>

      {/* Expired Shops Alert */}
      {stats.expiredShops > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            <strong>{stats.expiredShops} shop(s)</strong> have expired subscriptions.{' '}
            <Link href="/super-admin/shops?filter=expired" className="underline font-medium">
              View →
            </Link>
          </span>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>
                  <card.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Shops */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Shops</CardTitle>
            <Link
              href="/super-admin/shops"
              className="text-sm text-orange-600 hover:underline"
            >
              View all →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-gray-100">
            {stats.recentShops.map((shop: any) => {
              const sub = shop.shop_subscriptions?.[0]
              const planName = sub?.subscription_plans?.display_name ?? 'Trial'
              const subStatus = sub?.status ?? 'trial'
              const statusColor: Record<string, string> = {
                active: 'bg-green-100 text-green-700',
                trial: 'bg-blue-100 text-blue-700',
                expired: 'bg-red-100 text-red-700',
                suspended: 'bg-gray-100 text-gray-600',
              }

              return (
                <Link
                  key={shop.id}
                  href={`/super-admin/shops/${shop.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center text-lg shrink-0">
                      🙏
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{shop.name}</p>
                      <p className="text-xs text-gray-400">{shop.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[subStatus] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {planName}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${shop.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {shop.status}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
