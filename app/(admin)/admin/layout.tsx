import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/admin/layout/Sidebar'
import { TopBar } from '@/components/admin/layout/TopBar'
import { PlanLimitBanner } from '@/components/admin/layout/PlanLimitBanner'

async function getShopAndPlan(shopId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('shops')
    .select('name, shop_subscriptions(status, expires_at, subscription_plans(name, display_name))')
    .eq('id', shopId)
    .single()

  const sub = (data?.shop_subscriptions as any[])?.[0]
  const plan = sub?.subscription_plans

  const daysLeft = sub?.expires_at
    ? Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86_400_000)
    : null

  return {
    shopName: data?.name ?? 'My Shop',
    planName: plan?.name ?? null,
    planDisplayName: plan?.display_name ?? null,
    subStatus: sub?.status ?? null,
    daysLeft,
  }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireAdmin()
  const { shopName, planName, planDisplayName, subStatus, daysLeft } = await getShopAndPlan(
    user.shop_id!
  )

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <PlanLimitBanner daysLeft={daysLeft} planName={planDisplayName} status={subStatus} />
        <TopBar shopName={shopName} userName={user.name ?? user.email ?? ''} planName={planName} />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
