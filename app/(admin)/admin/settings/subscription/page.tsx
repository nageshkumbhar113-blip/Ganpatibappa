'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, CreditCard, CheckCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Subscription {
  id: string
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  expires_at?: string
  trial_ends_at?: string
  created_at: string
  subscription_plans: {
    name: string
    price: number
    billing_cycle: string
    features: string[]
  }
}

const STATUS_CONFIG = {
  trial: { label: 'Trial', color: 'bg-blue-100 text-blue-700', icon: Clock },
  active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  expired: { label: 'Expired', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: AlertTriangle },
}

export default function SubscriptionPage() {
  const [sub, setSub] = useState<Subscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/subscription')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error)
        setSub(d.subscription ?? null)
      })
      .catch(() => toast.error('Failed to load subscription'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  const config = sub ? STATUS_CONFIG[sub.status] : null
  const StatusIcon = config?.icon ?? Clock
  const expiryDate = sub?.expires_at ?? sub?.trial_ends_at
  const daysLeft = expiryDate
    ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="p-6 space-y-5 max-w-lg">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Subscription</h1>
        <p className="text-sm text-gray-500">तुमचा current plan आणि billing details</p>
      </div>

      {sub ? (
        <>
          {/* Current plan card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900">{sub.subscription_plans.name}</p>
                <p className="text-sm text-gray-500">
                  ₹{sub.subscription_plans.price}/{sub.subscription_plans.billing_cycle}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${config?.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {config?.label}
              </span>
            </div>

            {expiryDate && (
              <div className={`rounded-lg p-3 text-sm ${
                daysLeft !== null && daysLeft <= 7 ? 'bg-red-50 text-red-700' :
                daysLeft !== null && daysLeft <= 14 ? 'bg-yellow-50 text-yellow-700' :
                'bg-gray-50 text-gray-600'
              }`}>
                {sub.status === 'trial' ? (
                  <p>Trial ends on <strong>{formatDate(expiryDate)}</strong>
                    {daysLeft !== null && ` (${daysLeft} days left)`}
                  </p>
                ) : (
                  <p>Renews on <strong>{formatDate(expiryDate)}</strong>
                    {daysLeft !== null && daysLeft <= 30 && ` (${daysLeft} days left)`}
                  </p>
                )}
              </div>
            )}

            {/* Features */}
            {sub.subscription_plans.features?.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">Plan Features</p>
                <ul className="space-y-1">
                  {sub.subscription_plans.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Upgrade CTA */}
          {sub.status !== 'active' || sub.subscription_plans.name !== 'Premium' ? (
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white space-y-3">
              <p className="font-bold text-lg">Upgrade to Premium ⭐</p>
              <p className="text-sm text-orange-100">
                Festival campaigns, 2FA security, custom domain, unlimited products आणि बरेच काही!
              </p>
              <a
                href="https://ganpatibappa.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white text-orange-600 font-semibold px-4 py-2 text-sm hover:bg-orange-50 transition-colors"
              >
                View Plans
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <div className="rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle className="h-5 w-5 inline mr-2" />
              You're on the <strong>Premium</strong> plan — all features unlocked!
            </div>
          )}

          {/* Contact support */}
          <div className="text-center">
            <p className="text-xs text-gray-400">
              Billing साठी contact करा:{' '}
              <a href="mailto:support@ganpatibappa.com" className="text-orange-500 hover:underline">
                support@ganpatibappa.com
              </a>
            </p>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <CreditCard className="h-12 w-12 mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">No subscription found.</p>
          <p className="text-xs text-gray-400 mt-1">Super Admin शी contact करा.</p>
        </div>
      )}
    </div>
  )
}
