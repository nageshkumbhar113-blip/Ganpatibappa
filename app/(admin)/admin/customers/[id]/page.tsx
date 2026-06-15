'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Phone, Mail, MapPin, ShoppingBag, Star } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  total_orders: number
  total_spent: number
  last_order_at?: string
  created_at: string
}

interface Order {
  id: string
  order_number?: string
  total_amount: number
  status: string
  payment_status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  in_production: 'bg-purple-100 text-purple-700',
  ready: 'bg-orange-100 text-orange-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/customers/${id}`).then((r) => r.json()),
      fetch(`/api/admin/orders?customer_id=${id}&limit=20`).then((r) => r.json()),
    ]).then(([custData, ordersData]) => {
      if (custData.error) toast.error(custData.error)
      setCustomer(custData.customer ?? null)
      setOrders(ordersData.orders ?? [])
    }).catch(() => toast.error('Failed to load customer'))
    .finally(() => setIsLoading(false))
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  if (!customer) return <div className="p-6 text-gray-500">Customer not found.</div>

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/customers" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
          <p className="text-sm text-gray-400">Customer since {formatDate(customer.created_at)}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{customer.total_orders}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Orders</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-orange-500">{formatCurrency(customer.total_spent)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Spent</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">
            {customer.total_orders > 0
              ? formatCurrency(customer.total_spent / customer.total_orders)
              : '—'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Avg Order</p>
        </div>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Contact Info</h2>
        <div className="space-y-2">
          <a
            href={`tel:${customer.phone}`}
            className="flex items-center gap-3 text-sm text-gray-700 hover:text-orange-600 transition-colors"
          >
            <Phone className="h-4 w-4 text-gray-400" />
            {customer.phone}
          </a>
          {customer.email && (
            <a
              href={`mailto:${customer.email}`}
              className="flex items-center gap-3 text-sm text-gray-700 hover:text-orange-600 transition-colors"
            >
              <Mail className="h-4 w-4 text-gray-400" />
              {customer.email}
            </a>
          )}
          {customer.address && (
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
              {customer.address}
            </div>
          )}
          {customer.last_order_at && (
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <ShoppingBag className="h-4 w-4 text-gray-400" />
              Last order: {formatDate(customer.last_order_at)}
            </div>
          )}
        </div>

        {/* WhatsApp quick link */}
        <a
          href={`https://wa.me/91${customer.phone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-xs font-semibold text-white hover:bg-green-600 transition-colors"
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp करा
        </a>
      </div>

      {/* Order history */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Order History</h2>
        </div>
        {orders.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Order</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="text-orange-600 hover:underline font-medium">
                      #{o.order_number ?? o.id.slice(0, 8).toUpperCase()}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[o.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {formatCurrency(o.total_amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {formatDate(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
