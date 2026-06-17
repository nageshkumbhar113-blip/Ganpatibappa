'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, Loader2, CreditCard, Smartphone } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { useShop } from '@/lib/contexts/shop-context'
import { formatCurrency } from '@/lib/utils/format'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, totalAmount, clearCart } = useCart()
  const { basePath, apiFetch } = useShop()
  const [isSubmitting, startTransition] = useTransition()
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null)
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', customer_address: '', pickup_date: '', payment_method: 'upi', advance_amount: '', notes: '' })

  function set(field: string, value: string) { setForm(f => ({ ...f, [field]: value })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.length === 0) { toast.error('Cart is empty'); return }

    startTransition(async () => {
      let screenshotUrl: string | undefined
      if (paymentScreenshot) {
        const fd = new FormData()
        fd.append('file', paymentScreenshot)
        const upRes = await apiFetch('/api/shop/payment/screenshot', { method: 'POST', body: fd })
        if (upRes.ok) { const d = await upRes.json(); screenshotUrl = d.url }
      }

      const res = await apiFetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.id, quantity: i.quantity })),
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_email: form.customer_email || undefined,
          customer_address: form.customer_address || undefined,
          pickup_date: form.pickup_date || undefined,
          payment_method: form.payment_method,
          advance_amount: form.advance_amount ? parseFloat(form.advance_amount) : undefined,
          payment_screenshot_url: screenshotUrl,
          notes: form.notes || undefined,
          total_amount: totalAmount,
        }),
      })

      if (res.ok) {
        const d = await res.json()
        clearCart()
        toast.success(`Order confirmed! #${d.order.order_number}`)
        router.push(`${basePath}/orders/${d.order.id}`)
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
        <Link href={`${basePath}/products`} className="text-orange-500 hover:underline text-sm">Browse products</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href={`${basePath}/cart`} className="text-gray-500 hover:text-gray-800"><ChevronLeft className="h-5 w-5" /></Link>
        <h1 className="text-sm font-bold text-gray-900">Checkout</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Order Summary */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50"><h2 className="text-sm font-bold text-gray-900">Order Summary ({items.length} items)</h2></div>
          <div className="divide-y divide-gray-50">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-orange-50">{item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-lg">🙏</div>}</div>
                <div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-900 line-clamp-1">{item.name}</p><p className="text-xs text-gray-400">Qty: {item.quantity}</p></div>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-gray-100 flex justify-between"><span className="text-sm font-bold text-gray-700">Total</span><span className="text-sm font-bold text-gray-900">{formatCurrency(totalAmount)}</span></div>
        </div>

        {/* Customer Details */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Your Details</h2>
          {[
            { label: 'Full Name *', field: 'customer_name', type: 'text', required: true, placeholder: 'Ramesh Patil' },
            { label: 'Phone Number *', field: 'customer_phone', type: 'tel', required: true, placeholder: '9876543210' },
            { label: 'Email (optional)', field: 'customer_email', type: 'email', required: false, placeholder: 'ram@example.com' },
          ].map(({ label, field, type, required, placeholder }) => (
            <div key={field}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
              <input required={required} type={type} value={(form as any)[field]} onChange={e => set(field, e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder={placeholder} />
            </div>
          ))}
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Delivery Address</label><textarea rows={2} value={form.customer_address} onChange={e => set('customer_address', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" placeholder="Street, City, Pincode…" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Pickup / Delivery Date</label><input type="date" value={form.pickup_date} onChange={e => set('pickup_date', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Special Notes</label><textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" placeholder="Any special requirements…" /></div>
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Payment</h2>
          <div className="grid grid-cols-3 gap-2">
            {[{ key: 'upi', label: 'UPI', icon: <Smartphone className="h-4 w-4" /> }, { key: 'cash', label: 'Cash', icon: '💵' }, { key: 'bank_transfer', label: 'Bank', icon: <CreditCard className="h-4 w-4" /> }].map(m => (
              <button key={m.key} type="button" onClick={() => set('payment_method', m.key)} className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 text-xs font-medium transition-colors ${form.payment_method === m.key ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600'}`}>
                {typeof m.icon === 'string' ? <span className="text-xl">{m.icon}</span> : m.icon}{m.label}
              </button>
            ))}
          </div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Advance Amount (optional)</label><input type="number" min="0" max={totalAmount} value={form.advance_amount} onChange={e => set('advance_amount', e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="0" /><p className="text-xs text-gray-400 mt-1">Leave blank if paying full amount later</p></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Payment Screenshot (optional)</label><input type="file" accept="image/*" onChange={e => setPaymentScreenshot(e.target.files?.[0] ?? null)} className="w-full text-xs text-gray-600 file:mr-2 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-orange-700" /></div>
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full rounded-xl bg-orange-500 py-4 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}Place Order — {formatCurrency(totalAmount)}
        </button>
      </form>
    </div>
  )
}
