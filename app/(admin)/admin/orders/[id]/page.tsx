'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ChevronLeft, Download, Loader2, Phone, MapPin, Calendar, CreditCard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  formatCurrency, formatDate, formatDateTime,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/utils/format'

const ORDER_STATUSES = [
  'pending', 'confirmed', 'in_production', 'ready', 'delivered', 'cancelled',
]

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>()
  const [order, setOrder] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch(`/api/admin/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => setOrder(d.order))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setIsLoading(false))
  }, [params.id])

  async function updateStatus(newStatus: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const data = await res.json()
        setOrder((o: any) => ({ ...o, status: data.order.status }))
        toast.success(`Status updated to "${ORDER_STATUS_LABELS[newStatus]}"`)
      } else {
        toast.error('Failed to update status')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6 text-center text-gray-400">
        <p>Order not found.</p>
        <Link href="/admin/orders" className="text-orange-500 hover:underline mt-2 inline-block">
          Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" /> Orders
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-lg font-bold text-gray-900">#{order.order_number}</h1>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_COLORS[order.status] ?? 'bg-gray-100'}`}
          >
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <a
          href={`/api/admin/orders/${order.id}/invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" /> Invoice PDF
        </a>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Items Ordered</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-5 py-2.5 font-semibold text-gray-500">Product</th>
                    <th className="px-5 py-2.5 font-semibold text-gray-500 text-right">Price</th>
                    <th className="px-5 py-2.5 font-semibold text-gray-500 text-center">Qty</th>
                    <th className="px-5 py-2.5 font-semibold text-gray-500 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(order.order_items ?? []).map((item: any) => (
                    <tr key={item.id}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          {item.products?.images?.[0] && (
                            <img
                              src={item.products.images[0]}
                              alt={item.product_name}
                              className="h-9 w-9 rounded-md object-cover"
                            />
                          )}
                          <span className="font-medium text-gray-900">{item.product_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="px-5 py-3 text-center text-gray-600">{item.quantity}</td>
                      <td className="px-5 py-3 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-100">
                  <tr>
                    <td colSpan={3} className="px-5 py-3 text-right font-semibold text-gray-700">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-gray-900">{formatCurrency(order.total_amount)}</td>
                  </tr>
                  {order.advance_amount > 0 && (
                    <>
                      <tr>
                        <td colSpan={3} className="px-5 py-1 text-right text-sm text-green-600">Advance Paid</td>
                        <td className="px-5 py-1 text-right text-sm text-green-600">{formatCurrency(order.advance_amount)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-5 py-1 text-right text-sm font-semibold text-red-600">Balance Due</td>
                        <td className="px-5 py-1 text-right text-sm font-semibold text-red-600">{formatCurrency(order.total_amount - (order.advance_amount ?? 0))}</td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Status Update */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Update Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    disabled={isPending || order.status === s}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 capitalize ${
                      order.status === s
                        ? ORDER_STATUS_COLORS[s] + ' cursor-default'
                        : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {isPending && order.status !== s ? (
                      <Loader2 className="h-3 w-3 animate-spin inline" />
                    ) : (
                      ORDER_STATUS_LABELS[s]
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Customer */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-gray-900">{order.customer_name}</p>
              <div className="flex items-center gap-2 text-gray-500">
                <Phone className="h-3.5 w-3.5" />
                <span>{order.customer_phone}</span>
              </div>
              {order.customer_address && (
                <div className="flex items-start gap-2 text-gray-500">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>{order.customer_address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Ordered</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
              {order.pickup_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Pickup</span>
                  <span>{formatDate(order.pickup_date)}</span>
                </div>
              )}
              {order.delivery_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivery</span>
                  <span className="font-medium text-orange-600">{formatDate(order.delivery_date)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Method</span>
                <span className="capitalize">{order.payment_method ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span
                  className={`font-medium ${
                    order.payment_status === 'paid' ? 'text-green-600' :
                    order.payment_status === 'partial' ? 'text-yellow-600' : 'text-gray-600'
                  }`}
                >
                  {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
