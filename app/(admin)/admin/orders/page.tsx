import { requireAdmin } from '@/lib/middleware/auth-guard'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency, formatDate, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/utils/format'
import { Search, ShoppingBag } from 'lucide-react'

interface OrdersPageProps {
  searchParams: {
    status?: string
    q?: string
    page?: string
  }
}

async function getOrders(shopId: string, status?: string, q?: string, page = 1) {
  const supabase = createClient()
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabase
    .from('orders')
    .select(
      'id, order_number, customer_name, customer_phone, total_amount, advance_amount, status, payment_status, created_at, delivery_date',
      { count: 'exact' }
    )
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (q) query = query.or(`customer_name.ilike.%${q}%,order_number.ilike.%${q}%`)

  const { data, count } = await query
  return { orders: data ?? [], total: count ?? 0, limit }
}

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'in_production', label: 'In Production' },
  { key: 'ready', label: 'Ready' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
]

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const user = await requireAdmin()
  const page = parseInt(searchParams.page ?? '1')
  const { orders, total, limit } = await getOrders(
    user.shop_id!,
    searchParams.status,
    searchParams.q,
    page
  )

  const totalPages = Math.ceil(total / limit)
  const currentStatus = searchParams.status ?? ''

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500">{total} total orders</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/orders?status=${f.key}`}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                currentStatus === f.key
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <form method="GET" className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q}
            placeholder="Search orders…"
            className="rounded-lg border border-gray-200 bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 w-56"
          />
          {searchParams.status && (
            <input type="hidden" name="status" value={searchParams.status} />
          )}
        </form>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <ShoppingBag className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No orders found.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Order</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Payment</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order: any) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">#{order.order_number}</p>
                    {order.delivery_date && (
                      <p className="text-xs text-gray-400">
                        Delivery: {formatDate(order.delivery_date)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                    {order.advance_amount > 0 && (
                      <p className="text-xs text-green-600">
                        Adv: {formatCurrency(order.advance_amount)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.payment_status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : order.payment_status === 'partial'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {formatDate(order.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/orders?page=${p}${searchParams.status ? `&status=${searchParams.status}` : ''}${searchParams.q ? `&q=${searchParams.q}` : ''}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                p === page ? 'bg-orange-500 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
