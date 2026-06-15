import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Package, ShoppingBag, Users, MessageCircle, TrendingUp, Star } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format'

async function getDashboardStats(shopId: string) {
  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { count: totalProducts },
    { count: activeOrders },
    { count: totalCustomers },
    { count: newInquiries },
    { count: pendingReviews },
    { data: recentOrders },
    { data: monthlyRevenue },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_active', true),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .in('status', ['pending', 'confirmed', 'in_production']),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('role', 'customer'),
    supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('status', 'new'),
    supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .eq('is_approved', false),
    supabase
      .from('orders')
      .select('id, order_number, customer_name, total_amount, status, created_at')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('orders')
      .select('total_amount')
      .eq('shop_id', shopId)
      .not('status', 'eq', 'cancelled')
      .gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const revenue = (monthlyRevenue ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0)

  return {
    totalProducts: totalProducts ?? 0,
    activeOrders: activeOrders ?? 0,
    totalCustomers: totalCustomers ?? 0,
    newInquiries: newInquiries ?? 0,
    pendingReviews: pendingReviews ?? 0,
    revenue,
    recentOrders: recentOrders ?? [],
  }
}

const ORDER_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_production: 'bg-purple-100 text-purple-700',
  ready: 'bg-green-100 text-green-700',
  delivered: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
}

export default async function AdminDashboard() {
  const user = await requireAdmin()
  const stats = await getDashboardStats(user.shop_id!)

  const statCards = [
    {
      title: '30-Day Revenue',
      value: formatCurrency(stats.revenue),
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50',
      href: '/admin/reports',
    },
    {
      title: 'Active Orders',
      value: stats.activeOrders,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      href: '/admin/orders',
    },
    {
      title: 'Products',
      value: stats.totalProducts,
      icon: Package,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      href: '/admin/products',
    },
    {
      title: 'Customers',
      value: stats.totalCustomers,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      href: '/admin/customers',
    },
    {
      title: 'New Inquiries',
      value: stats.newInquiries,
      icon: MessageCircle,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      href: '/admin/inquiries',
    },
    {
      title: 'Pending Reviews',
      value: stats.pendingReviews,
      icon: Star,
      color: 'text-pink-600',
      bg: 'bg-pink-50',
      href: '/admin/reviews',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user.name?.split(' ')[0] ?? 'Admin'} 🙏
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Here's what's happening with your shop today.
        </p>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {statCards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{card.title}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{card.value}</p>
                  </div>
                  <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <Card className="border-0 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/admin/orders" className="text-sm text-orange-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {stats.recentOrders.length === 0 && (
            <p className="p-6 text-center text-sm text-gray-400">No orders yet.</p>
          )}
          {stats.recentOrders.map((order: any) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">#{order.order_number}</p>
                <p className="text-xs text-gray-400">{order.customer_name}</p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ORDER_STATUS_COLOR[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {order.status.replace('_', ' ')}
                </span>
                <span className="text-sm font-semibold text-gray-800">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
