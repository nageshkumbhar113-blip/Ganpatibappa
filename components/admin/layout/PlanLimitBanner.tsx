'use client'

import { AlertTriangle, Clock, X } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

interface PlanLimitBannerProps {
  daysLeft: number | null
  planName: string | null
  status: string | null
}

export function PlanLimitBanner({ daysLeft, planName, status }: PlanLimitBannerProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null
  if (!daysLeft && status !== 'expired') return null

  const isExpired = status === 'expired' || status === 'suspended' || (daysLeft !== null && daysLeft <= 0)
  const isUrgent = daysLeft !== null && daysLeft <= 3 && !isExpired
  const isWarning = daysLeft !== null && daysLeft <= 7 && !isUrgent && !isExpired

  if (!isExpired && !isUrgent && !isWarning) return null

  const bgClass = isExpired
    ? 'bg-red-600'
    : isUrgent
    ? 'bg-orange-500'
    : 'bg-yellow-500'

  const message = isExpired
    ? 'Your subscription has expired. Your shop is now suspended.'
    : isUrgent
    ? `Your ${planName ?? 'subscription'} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.`
    : `Your ${planName ?? 'subscription'} plan expires in ${daysLeft} days.`

  return (
    <div className={`${bgClass} text-white px-4 py-2 flex items-center justify-between text-sm`}>
      <div className="flex items-center gap-2">
        {isExpired ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <span>{message}</span>
        <Link
          href="/admin/settings/subscription"
          className="underline font-medium ml-1 hover:no-underline"
        >
          Renew Now →
        </Link>
      </div>
      {!isExpired && (
        <button
          onClick={() => setDismissed(true)}
          className="ml-4 hover:opacity-70"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
