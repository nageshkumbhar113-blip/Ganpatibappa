import { Badge } from '@/components/ui/badge'

interface SubscriptionBadgeProps {
  status: 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled' | string
  planName?: string
  daysLeft?: number | null
  size?: 'sm' | 'md'
}

export function SubscriptionBadge({
  status,
  planName,
  daysLeft,
  size = 'sm',
}: SubscriptionBadgeProps) {
  const config: Record<string, { label: string; className: string }> = {
    trial: { label: 'Trial', className: 'bg-blue-100 text-blue-700 border-blue-200' },
    active: { label: 'Active', className: 'bg-green-100 text-green-700 border-green-200' },
    expired: { label: 'Expired', className: 'bg-red-100 text-red-700 border-red-200' },
    suspended: { label: 'Suspended', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    cancelled: { label: 'Cancelled', className: 'bg-orange-100 text-orange-700 border-orange-200' },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const displayText = planName ? `${planName} · ${label}` : label
  const daysText = daysLeft !== null && daysLeft !== undefined && daysLeft > 0 && status !== 'active'
    ? ` (${daysLeft}d left)`
    : ''

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'} ${className}`}
    >
      {displayText}{daysText}
    </span>
  )
}
