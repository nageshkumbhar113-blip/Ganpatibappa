'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Shop {
  id: string
  name: string
  slug: string
}

interface Plan {
  id: string
  name: string
  price: number
  billing_cycle: string
}

export default function CreateSubscriptionPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [shops, setShops] = useState<Shop[]>([])
  const [plans, setPlans] = useState<Plan[]>([])

  const [form, setForm] = useState({
    shop_id: '',
    plan_id: '',
    status: 'active' as 'trial' | 'active' | 'expired' | 'cancelled',
    expires_at: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/super-admin/shops').then((r) => r.json()),
      fetch('/api/super-admin/plans').then((r) => r.json()),
    ]).then(([shopsData, plansData]) => {
      setShops(shopsData.shops ?? [])
      setPlans(plansData.plans ?? [])
    })
  }, [])

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/super-admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
        }),
      })
      if (res.ok) {
        toast.success('Subscription saved')
        router.push('/super-admin/subscriptions')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save subscription')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/subscriptions" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Create / Update Subscription</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Shop *</label>
          <select
            required
            value={form.shop_id}
            onChange={(e) => set('shop_id', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Select shop…</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.slug})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Plan *</label>
          <select
            required
            value={form.plan_id}
            onChange={(e) => set('plan_id', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Select plan…</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ₹{p.price}/{p.billing_cycle}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Status *</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Expires At</label>
          <input
            type="date"
            value={form.expires_at}
            onChange={(e) => set('expires_at', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Subscription
      </button>
    </form>
  )
}
