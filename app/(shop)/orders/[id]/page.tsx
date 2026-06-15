import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Phone, MapPin, Calendar } from 'lucide-react'
import {
  formatCurrency, formatDate, formatDateTime,
  ORDER_STATUS_LABELS, ORDER_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/lib/utils/format'

const STATUS_STEPS = ['pending', 'confirmed', 'in_production', 'ready', 'delivered']

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const shopId = headers().get('x-shop-id')
  if (!shopId) redirect('/login')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()
  const { data: order } = await admin
    .from('orders')
    .select(
      `*, order_items(*, products(name, images))`
    )
    .eq('id', params.id)
    .eq('shop_id', shopId)
    .single()

  if (!order) notFound()

  // Only show to owner (either the placing user or if unauthenticated order, allow if phone matches — skip for now)
  const currentStep = STATUS_STEPS.indexOf(order.status)

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/orders" className="text-gray-500 hover:text-gray-800">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-bold text-gray-900">Order #{order.order_number}</h1>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* Status Tracker */}
        {order.status !== 'cancelled' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4">Order Status</h2>
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-100" />
              <div
                className="absolute top-4 left-0 h-0.5 bg-orange-400 transition-all"
                style={{ width: currentStep < 0 ? '0%' : `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
              />
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const isCompleted = i <= currentStep
                  const isCurrent = i === currentStep
                  return (
                    <div key={step} className="flex flex-col items-center gap-1">
                      <div
                        className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                          isCompleted
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-200 bg-white text-gray-400'
                        } ${isCurrent ? 'ring-2 ring-orange-200 ring-offset-2' : ''}`}
                      >
                        {i + 1}
                      </div>
                      <span className={`text-[10px] font-medium text-center leading-tight ${isCompleted ? 'text-orange-600' : 'text-gray-400'}`}>
                        {ORDER_STATUS_LABELS[step]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
            <p className="text-red-700 font-semibold">This order has been cancelled.</p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Items Ordered</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {(order.order_items ?? []).map((item: any) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-orange-50">
                  {item.products?.images?.[0] ? (
                    <img src={item.products.images[0]} alt={item.product_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-xl">🙏</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                  <p className="text-xs text-gray-400">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                </div>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-gray-700">Total</span>
              <span className="font-bold">{formatCurrency(order.total_amount)}</span>
            </div>
            {order.advance_amount > 0 && (
              <>
                <div className="flex justify-between text-xs text-green-600">
                  <span>Advance Paid</span>
                  <span>{formatCurrency(order.advance_amount)}</span>
                </div>
                <div className="flex justify-between text-xs text-red-600 font-semibold">
                  <span>Balance Due</span>
                  <span>{formatCurrency(order.balance_amount ?? (order.total_amount - order.advance_amount))}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 col-span-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Customer</h3>
            <p className="text-sm font-semibold text-gray-900">{order.customer_name}</p>
            <div className="flex items-center gap-1.5 mt-1 text-gray-500 text-sm">
              <Phone className="h-3.5 w-3.5" />
              <a href={`tel:${order.customer_phone}`} className="hover:text-orange-500">{order.customer_phone}</a>
            </div>
            {order.customer_address && (
              <div className="flex items-start gap-1.5 mt-1 text-gray-500 text-sm">
                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{order.customer_address}</span>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Payment</h3>
            <p className="text-xs capitalize text-gray-600">{order.payment_method ?? 'N/A'}</p>
            <p className={`text-sm font-semibold mt-1 ${
              order.payment_status === 'paid' ? 'text-green-600' :
              order.payment_status === 'partial' ? 'text-yellow-600' : 'text-gray-600'
            }`}>
              {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
            </p>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Dates</h3>
            <p className="text-xs text-gray-400">Ordered</p>
            <p className="text-xs font-medium text-gray-700">{formatDate(order.created_at)}</p>
            {order.delivery_date && (
              <>
                <p className="text-xs text-gray-400 mt-1">Delivery</p>
                <p className="text-xs font-semibold text-orange-600">{formatDate(order.delivery_date)}</p>
              </>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <h3 className="text-xs font-bold text-amber-700 mb-1">Notes</h3>
            <p className="text-sm text-amber-800">{order.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
