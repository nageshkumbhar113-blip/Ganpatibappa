import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '@/lib/utils/format'
import { ShoppingBag } from 'lucide-react'

export default async function MyOrdersPage() {
  const shopId = headers().get('x-shop-id')
  if (!shopId) redirect('/login')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, order_number, total_amount, advance_amount, status, payment_status, created_at, delivery_date, order_items(product_name, quantity)'
    )
    .eq('shop_id', shopId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">My Orders</h1>

        {!orders || orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-3">
            <ShoppingBag className="h-12 w-12 mx-auto opacity-30" />
            <p>No orders yet</p>
            <Link href="/products" className="inline-block text-orange-500 hover:underline text-sm">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order: any) => {
              const items: any[] = order.order_items ?? []
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">#{order.order_number}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
                      {items.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                          {items.map((i: any) => `${i.product_name} ×${i.quantity}`).join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(order.total_amount)}</p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                      >
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                  </div>
                  {order.delivery_date && (
                    <p className="mt-2 text-xs text-orange-600">
                      Delivery: {formatDate(order.delivery_date)}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
