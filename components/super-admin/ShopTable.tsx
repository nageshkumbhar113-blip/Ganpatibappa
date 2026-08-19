'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, Eye, Edit, Copy, Trash2 } from 'lucide-react'
import { SubscriptionBadge } from './SubscriptionBadge'
import { ShopStatusToggle } from './ShopStatusToggle'
import { formatDate } from '@/lib/utils/format'

interface Shop {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
  shop_subscriptions?: Array<{
    status: string
    expires_at: string
    subscription_plans?: { display_name: string; name: string } | null
  }>
}

interface ShopTableProps {
  shops: Shop[]
}

export function ShopTable({ shops }: ShopTableProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Shop | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()

  async function handleDelete() {
    if (!pendingDelete || confirmText !== pendingDelete.slug) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/super-admin/shops/${pendingDelete.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message ?? body?.error ?? `Delete failed (${res.status})`)
      }
      setPendingDelete(null)
      setConfirmText('')
      router.refresh()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  if (shops.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg">No shops found.</p>
        <Link
          href="/super-admin/shops/create"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Create First Shop
        </Link>
      </div>
    )
  }

  return (
    <>
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-100 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Shop</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Plan</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Expires</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {shops.map((shop) => {
            const sub = shop.shop_subscriptions?.[0]
            const planDisplay = sub?.subscription_plans?.display_name ?? 'Free Trial'
            const subStatus = sub?.status ?? 'trial'
            const expiresAt = sub?.expires_at
            const daysLeft = expiresAt
              ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
              : null

            return (
              <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                {/* Shop name */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-orange-100 flex items-center justify-center text-sm shrink-0">
                      🙏
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{shop.name}</p>
                      <p className="text-xs text-gray-400">{shop.slug}</p>
                    </div>
                  </div>
                </td>

                {/* Plan */}
                <td className="px-4 py-3">
                  <SubscriptionBadge
                    status={subStatus}
                    planName={planDisplay}
                    daysLeft={daysLeft}
                  />
                </td>

                {/* Expires */}
                <td className="px-4 py-3 text-gray-500">
                  {expiresAt ? formatDate(expiresAt) : '—'}
                </td>

                {/* Active toggle */}
                <td className="px-4 py-3">
                  <ShopStatusToggle shopId={shop.id} currentStatus={shop.status} />
                </td>

                {/* Created */}
                <td className="px-4 py-3 text-gray-500">{formatDate(shop.created_at)}</td>

                {/* Actions menu */}
                <td className="px-4 py-3 text-right">
                  <div className="relative inline-block">
                    <button
                      onClick={() => setOpenMenu(openMenu === shop.id ? null : shop.id)}
                      className="rounded-md p-1.5 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {openMenu === shop.id && (
                      <div
                        className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-gray-100 bg-white py-1 shadow-lg text-sm"
                        onBlur={() => setOpenMenu(null)}
                      >
                        <Link
                          href={`/super-admin/shops/${shop.id}`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Eye className="h-4 w-4" /> View
                        </Link>
                        <Link
                          href={`/super-admin/shops/${shop.id}/edit`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Edit className="h-4 w-4" /> Edit
                        </Link>
                        <Link
                          href={`/super-admin/shops/${shop.id}/backup`}
                          className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50"
                          onClick={() => setOpenMenu(null)}
                        >
                          <Copy className="h-4 w-4" /> Clone
                        </Link>
                        <hr className="my-1 border-gray-100" />
                        <button
                          className="flex w-full items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setOpenMenu(null)
                            setConfirmText('')
                            setDeleteError(null)
                            setPendingDelete(shop)
                          }}
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Delete this shop?</h3>
            <p className="mt-2 text-sm text-gray-600">
              <strong>{pendingDelete.name}</strong> will be marked deleted and its storefront
              will stop serving customers. Its data is retained, but this is not reversible
              from this screen.
            </p>
            <p className="mt-4 text-sm text-gray-700">
              Type <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{pendingDelete.slug}</code> to confirm:
            </p>
            <input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
              placeholder={pendingDelete.slug}
            />
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setPendingDelete(null); setConfirmText(''); setDeleteError(null) }}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText !== pendingDelete.slug}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Delete shop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
