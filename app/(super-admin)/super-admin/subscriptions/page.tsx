'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, CreditCard, Search } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Subscription {
  id: string
  shop_id: string
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  expires_at?: string
  created_at: string
  shops: { id: string; name: string; slug: string; owner_email: string; status: string }
  subscription_plans: { id: string; name: string; price: number; billing_cycle: string }
}

const STATUS_COLORS = {
  trial: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  expired: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
}

export default function SuperAdminSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (statusFilter) params.set('status', statusFilter)
    fetch(`/api/super-admin/subscriptions?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error)
        setSubs(d.subscriptions ?? [])
        setTotal(d.total ?? 0)
      })
      .catch(() => toast.error('Failed to load subscriptions'))
      .finally(() => setIsLoading(false))
  }, [statusFilter, page])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Subscriptions</h1>
        <p className="text-sm text-gray-500">{total} total across all shops</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {(['', 'trial', 'active', 'expired', 'cancelled'] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1) }}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              statusFilter === s
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No subscriptions found</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Shop</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Expires</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.shops?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{s.shops?.owner_email}</p>
                      <p className="text-xs text-gray-400">{s.shops?.slug}.ganpatibappa.com</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{s.subscription_plans?.name}</p>
                      <p className="text-xs text-gray-400">
                        ₹{s.subscription_plans?.price}/{s.subscription_plans?.billing_cycle}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {s.expires_at ? formatDate(s.expires_at) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {formatDate(s.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
