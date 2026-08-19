'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Search, ShoppingBag } from 'lucide-react'

// There is no customer signup/login anywhere in this app — checkout has
// always been guest-only — so "My Orders" can't be an account-scoped
// list. Instead: track a specific order with the phone number + order
// number the customer already has from their order confirmation/WhatsApp.
export default function TrackOrderPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [phone, setPhone] = useState('')
  const [orderNumber, setOrderNumber] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/shop/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, order_number: orderNumber }),
      })
      const d = await res.json().catch(() => ({}))
      if (res.ok && d.order_id) {
        router.push(`/orders/${d.order_id}`)
      } else {
        toast.error(d.error ?? 'ऑर्डर सापडला नाही.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="text-center mb-6">
          <ShoppingBag className="h-10 w-10 mx-auto text-orange-400 mb-2" />
          <h1 className="text-xl font-bold text-gray-900">तुमचा ऑर्डर शोधा</h1>
          <p className="text-sm text-gray-500 mt-1">ऑर्डर केल्यावर मिळालेला Order Number आणि तुमचा फोन नंबर टाका</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number</label>
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="9876543210"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Order Number</label>
            <input
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="FRE202608190001"
            />
            <p className="text-xs text-gray-400 mt-1">हा नंबर ऑर्डर confirm झाल्यावर दाखवला होता</p>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            ऑर्डर शोधा
          </button>
        </form>
      </div>
    </div>
  )
}
