'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Trash2, RotateCcw } from 'lucide-react'

// There was no actual "Delete Shop" button anywhere in Super Admin --
// the shop detail page's status toggle only ever switches between
// active/suspended, and once a shop's status *was* 'deleted' that same
// toggle disables itself with no way back either. The only way to
// delete (or undo it) was to open Edit Shop and pick 'Deleted' out of
// a plain Status dropdown shared with Active/Suspended/Pending -- not
// something a person looking for a delete action would find.
export function ShopDangerZone({ shopId, shopName, status }: { shopId: string; shopName: string; status: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmText, setConfirmText] = useState('')
  const isDeleted = status === 'deleted'

  function handleDelete() {
    if (confirmText.trim() !== shopName) {
      toast.error(`Shop चं नाव बरोबर टाका: "${shopName}"`)
      return
    }
    startTransition(async () => {
      const res = await fetch(`/api/super-admin/shops/${shopId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Shop delete झाली — नंतर परत restore करता येईल')
        router.push('/super-admin/shops')
        router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? 'Delete करता आलं नाही')
      }
    })
  }

  function handleRestore() {
    startTransition(async () => {
      const res = await fetch(`/api/super-admin/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      })
      if (res.ok) {
        toast.success('Shop परत active झाली')
        router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? 'Restore करता आलं नाही')
      }
    })
  }

  if (isDeleted) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-sm font-bold text-amber-800 mb-1">ही shop delete झालेली आहे</h3>
        <p className="text-xs text-amber-700 mb-3">Storefront customers ना दिसत नाही, owner login करू शकत नाही. परत active करता येईल.</p>
        <button
          onClick={handleRestore}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          Shop Restore करा
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-red-800 mb-1">Danger Zone</h3>
        <p className="text-xs text-red-600">Shop delete केल्यावर customers ना storefront दिसणार नाही, owner login करू शकणार नाही. हे soft-delete आहे — नंतर याच page वरून परत restore करता येईल.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={`खात्री करण्यासाठी "${shopName}" टाका`}
          className="flex-1 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
        />
        <button
          onClick={handleDelete}
          disabled={isPending || confirmText.trim() !== shopName}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Shop Delete करा
        </button>
      </div>
    </div>
  )
}
