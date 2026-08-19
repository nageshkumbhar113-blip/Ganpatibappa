'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, CreditCard, Smartphone } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils/format'
import { UpiPaymentQR } from '@/components/shop/UpiPaymentQR'
import { getCustomerDetails, saveCustomerDetails } from '@/lib/utils/local-customer'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalAmount, clearCart } = useCart()
  const [isSubmitting, startTransition] = useTransition()

  const [form, setForm] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    pickup_date: '',
    payment_method: 'upi',
    advance_amount: '',
    notes: '',
  })

  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [upi, setUpi] = useState<{ upi_id: string; upi_name?: string; account_holder_name?: string } | null>(null)

  useEffect(() => {
    // (shop) tree = subdomain/custom-domain shops — middleware resolves
    // x-shop-id from the hostname itself, no x-shop-slug header needed.
    fetch('/api/shop/info')
      .then((r) => r.json())
      .then((d) => { if (d.shop?.upi_id) setUpi(d.shop) })
      .catch(() => {})
    // No login exists — "remember me" comes from lib/utils/local-customer.ts
    // instead, saved after a previous order or via the "My Details" page.
    const saved = getCustomerDetails(window.location.hostname)
    if (saved.name || saved.phone || saved.address) {
      setForm((f) => ({ ...f, customer_name: saved.name || f.customer_name, customer_phone: saved.phone || f.customer_phone, customer_address: saved.address || f.customer_address }))
    }
  }, [])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  const amountDue = form.advance_amount ? parseFloat(form.advance_amount) || 0 : totalAmount

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) {
      toast.error('Cart is empty')
      return
    }

    startTransition(async () => {
      let screenshotUrl: string | undefined

      if (paymentScreenshot) {
        // Was posting to /api/admin/upload, which requires an admin session
        // a real customer never has — every checkout screenshot upload here
        // 401'd silently (only `upRes.ok` was checked, no error surfaced),
        // so the order still placed but the screenshot was quietly dropped
        // every single time. /api/shop/payment/screenshot is the actual
        // public, customer-facing upload route (also exempt from the
        // per-shop Cloudinary quota, so it's never blocked either).
        const fd = new FormData()
        fd.append('file', paymentScreenshot)
        const upRes = await fetch('/api/shop/payment/screenshot', { method: 'POST', body: fd })
        if (upRes.ok) {
          const upData = await upRes.json()
          screenshotUrl = upData.url
        } else {
          toast.error('Payment screenshot upload failed — order will still be placed, please share the screenshot separately if needed.')
        }
      }

      const advance = form.advance_amount ? parseFloat(form.advance_amount) : undefined

      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.id,
            quantity: i.quantity,
          })),
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email || undefined,
          customer_address: form.customer_address || undefined,
          pickup_date: form.pickup_date || undefined,
          payment_method: form.payment_method,
          advance_amount: advance,
          payment_screenshot_url: screenshotUrl,
          notes: form.notes || undefined,
          total_amount: totalAmount,
        }),
      })

      if (res.ok) {
        const d = await res.json()
        clearCart()
        saveCustomerDetails(window.location.hostname, { name: form.customer_name, phone: form.customer_phone, address: form.customer_address })
        toast.success(`Order placed! #${d.order.order_number}`)
        router.push(`/orders/${d.order.id}`)
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to place order')
      }
    })
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-gray-400">
        <p>Your cart is empty.</p>
        <Link href="/products" className="text-orange-500 hover:underline text-sm">Browse products</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/cart" className="text-gray-500 hover:text-gray-800">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-sm font-bold text-gray-900">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Order Summary ({items.length} items)</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-orange-50">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center text-lg">🙏</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Your Details</h2>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
            <input
              required
              value={form.customer_name}
              onChange={(e) => set('customer_name', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ramesh Patil"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number *</label>
            <input
              required
              type="tel"
              value={form.customer_phone}
              onChange={(e) => set('customer_phone', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email (optional)</label>
            <input
              type="email"
              value={form.customer_email}
              onChange={(e) => set('customer_email', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="ram@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Delivery Address</label>
            <textarea
              rows={2}
              value={form.customer_address}
              onChange={(e) => set('customer_address', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              placeholder="Street, City, Pincode…"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Pickup / Delivery Date</label>
            <input
              type="date"
              value={form.pickup_date}
              onChange={(e) => set('pickup_date', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Special Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              placeholder="Any special requirements…"
            />
          </div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Payment</h2>

          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'upi', label: 'UPI', icon: <Smartphone className="h-4 w-4" /> },
              { key: 'cash', label: 'Cash', icon: '💵' },
              { key: 'bank_transfer', label: 'Bank', icon: <CreditCard className="h-4 w-4" /> },
            ].map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => set('payment_method', m.key)}
                className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-medium transition-colors ${
                  form.payment_method === m.key
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {typeof m.icon === 'string' ? <span className="text-xl">{m.icon}</span> : m.icon}
                {m.label}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Booking Amount (Advance) — optional
            </label>
            <input
              type="number"
              min="0"
              max={totalAmount}
              value={form.advance_amount}
              onChange={(e) => set('advance_amount', e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="0"
            />
            <p className="text-xs text-gray-400 mt-1">मूर्ती book करण्यासाठी आत्ता किती रक्कम भरताय ते टाका — बाकी रक्कम नंतर. रिकामं ठेवल्यास पूर्ण रक्कम नंतर भरा.</p>
          </div>

          {form.payment_method === 'upi' && upi?.upi_id && (
            <UpiPaymentQR
              upiId={upi.upi_id}
              payeeName={upi.upi_name || upi.account_holder_name}
              amount={amountDue}
              note="Order"
            />
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              Payment Screenshot (optional)
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPaymentScreenshot(e.target.files?.[0] ?? null)}
              className="w-full text-xs text-gray-600 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-orange-700 hover:file:bg-orange-100"
            />
          </div>
        </div>

        {/* Place Order */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-orange-500 py-4 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Place Order — {formatCurrency(totalAmount)}
        </button>
      </form>
    </div>
  )
}
