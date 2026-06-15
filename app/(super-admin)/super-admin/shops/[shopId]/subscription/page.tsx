'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'

interface Plan {
  id: string
  name: string
  price: number
  billing_cycle: string
}

interface CurrentSub {
  plan_id: string
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  expires_at?: string
  subscription_plans?: Plan
}

export default function ShopSubscriptionPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [plans, setPlans] = useState<Plan[]>([])
  const [shopName, setShopName] = useState('')
  const [current, setCurrent] = useState<CurrentSub | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [form, setForm] = useState({
    plan_id: '',
    status: 'active' as 'trial' | 'active' | 'expired' | 'cancelled',
    expires_at: '',
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/super-admin/shops/${shopId}`).then((r) => r.json()),
      fetch('/api/super-admin/plans').then((r) => r.json()),
    ]).then(([shopData, plansData]) => {
      const shop = shopData.shop
      setShopName(shop?.name ?? '')
      const sub = shop?.shop_subscriptions?.[0]
      if (sub) {
        setCurrent(sub)
        setForm({
          plan_id: sub.plan_id ?? '',
          status: sub.status ?? 'active',
          expires_at: sub.expires_at ? sub.expires_at.slice(0, 10) : '',
        })
      }
      setPlans(plansData.plans ?? [])
    }).catch(() => toast.error('Failed to load shop'))
    .finally(() => setIsLoading(false))
  }, [shopId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/super-admin/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop_id: shopId,
          plan_id: form.plan_id,
          status: form.status,
          expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
        }),
      })
      if (res.ok) {
        toast.success('Subscription updated')
        router.push('/super-admin/shops')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to update subscription')
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

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/shops" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Subscription</h1>
          <p className="text-sm text-gray-400">{shopName}</p>
        </div>
      </div>

      {current && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 text-sm text-orange-700">
          <p className="font-semibold">Current plan: {current.subscription_plans?.name ?? '—'}</p>
          <p className="text-xs mt-0.5">
            Status: <strong>{current.status}</strong>
            {current.expires_at && ` · Expires ${formatDate(current.expires_at)}`}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-gray-400" />
          Update Subscription
        </h2>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Plan *</label>
          <select
            required
            value={form.plan_id}
            onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
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
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as any }))}
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
            onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending || !form.plan_id}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Subscription
      </button>
    </form>
  )
}
