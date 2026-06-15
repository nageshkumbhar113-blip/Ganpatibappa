'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Download, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency } from '@/lib/utils/format'

interface Order {
  id: string
  order_number?: string
  customer_name: string
  customer_phone: string
  customer_address?: string
  total_amount: number
  advance_amount?: number
  balance_amount?: number
  payment_method: string
  payment_status: string
  status: string
  pickup_date?: string
  delivery_date?: string
  notes?: string
  created_at: string
  order_items?: Array<{
    product_name: string
    price: number
    quantity: number
    subtotal: number
  }>
}

interface ShopInfo {
  name: string
  address?: string
  whatsapp?: string
  logo_url?: string
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [shop, setShop] = useState<ShopInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPdfLoading, setIsPdfLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/orders/${id}`).then((r) => r.json()),
      fetch('/api/shop/info').then((r) => r.json()),
    ]).then(([orderData, shopData]) => {
      setOrder(orderData.order ?? null)
      setShop(shopData.shop ?? null)
    }).catch(() => toast.error('Failed to load invoice'))
    .finally(() => setIsLoading(false))
  }, [id])

  async function handleDownloadPdf() {
    setIsPdfLoading(true)
    try {
      const res = await fetch(`/api/admin/orders/${id}/invoice`)
      if (!res.ok) { toast.error('PDF generation failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${order?.order_number ?? id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('PDF download failed')
    } finally {
      setIsPdfLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  if (!order) return <div className="p-6 text-gray-500">Order not found.</div>

  const balance = order.balance_amount ?? (order.total_amount - (order.advance_amount ?? 0))

  return (
    <div className="p-6 max-w-2xl space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/orders/${id}`} className="text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Invoice</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={isPdfLoading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {isPdfLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Invoice preview */}
      <div id="invoice-preview" className="rounded-xl border border-gray-200 bg-white shadow-sm p-8 print:shadow-none print:border-none space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            {shop?.logo_url && (
              <img src={shop.logo_url} alt={shop?.name} className="h-12 w-auto mb-2 object-contain" />
            )}
            <h2 className="text-lg font-bold text-gray-900">{shop?.name}</h2>
            {shop?.address && <p className="text-xs text-gray-500 mt-0.5">{shop.address}</p>}
            {shop?.whatsapp && <p className="text-xs text-gray-500">WhatsApp: {shop.whatsapp}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-orange-500">INVOICE</p>
            <p className="text-xs text-gray-500 mt-1">
              #{order.order_number ?? order.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="text-xs text-gray-400">{formatDate(order.created_at)}</p>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Customer */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-semibold text-gray-900">{order.customer_name}</p>
            <p className="text-xs text-gray-500">{order.customer_phone}</p>
            {order.customer_address && (
              <p className="text-xs text-gray-500 mt-0.5">{order.customer_address}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Details</p>
            <p className="text-xs text-gray-600">
              Payment: <span className="font-medium">{order.payment_method.toUpperCase()}</span>
            </p>
            {order.pickup_date && (
              <p className="text-xs text-gray-600">
                Pickup: <span className="font-medium">{formatDate(order.pickup_date)}</span>
              </p>
            )}
            <p className="text-xs text-gray-600 mt-1">
              Status:{' '}
              <span className="font-medium capitalize">{order.payment_status}</span>
            </p>
          </div>
        </div>

        {/* Items table */}
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Product</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Qty</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Price</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(order.order_items ?? []).map((item, i) => (
                <tr key={i}>
                  <td className="px-4 py-2.5 text-gray-800">{item.product_name}</td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-800">{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="space-y-1.5 min-w-[200px]">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Total</span>
              <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
            </div>
            {(order.advance_amount ?? 0) > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Advance Paid</span>
                <span className="font-semibold">− {formatCurrency(order.advance_amount!)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-200 pt-1.5">
              <span>Balance Due</span>
              <span>{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {order.notes && (
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1">Notes</p>
            <p className="text-xs text-gray-500">{order.notes}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pt-4 border-t border-gray-100">
          Thank you for your order! 🙏 — {shop?.name}
        </p>
      </div>
    </div>
  )
}
