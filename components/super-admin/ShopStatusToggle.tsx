'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'

interface ShopStatusToggleProps {
  shopId: string
  currentStatus: 'active' | 'suspended' | 'deleted' | string
  onToggle?: (newStatus: string) => void
}

export function ShopStatusToggle({ shopId, currentStatus, onToggle }: ShopStatusToggleProps) {
  const [status, setStatus] = useState(currentStatus)
  const [isPending, startTransition] = useTransition()

  async function toggle() {
    const newStatus = status === 'active' ? 'suspended' : 'active'

    startTransition(async () => {
      const res = await fetch(`/api/super-admin/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        setStatus(newStatus)
        onToggle?.(newStatus)
      }
    })
  }

  const isActive = status === 'active'

  return (
    <button
      onClick={toggle}
      disabled={isPending || status === 'deleted'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive ? 'bg-green-500' : 'bg-gray-300'
      }`}
      aria-label={isActive ? 'Suspend shop' : 'Activate shop'}
      title={isActive ? 'Click to suspend' : 'Click to activate'}
    >
      {isPending ? (
        <Loader2 className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin text-white" />
      ) : (
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            isActive ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      )}
    </button>
  )
}
