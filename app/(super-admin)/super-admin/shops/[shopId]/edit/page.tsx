'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

interface ShopDetails {
  id: string
  name: string
  slug: string
  owner_email: string
  owner_name?: string
  owner_phone?: string
  status: string
  custom_domain?: string
}

export default function EditShopPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState<ShopDetails | null>(null)

  useEffect(() => {
    fetch(`/api/super-admin/shops/${shopId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error)
        setForm(d.shop ?? null)
      })
      .catch(() => toast.error('Failed to load shop'))
      .finally(() => setIsLoading(false))
  }, [shopId])

  const set = (field: keyof ShopDetails, value: string) =>
    setForm((f) => f ? { ...f, [field]: value } : f)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    startTransition(async () => {
      const res = await fetch(`/api/super-admin/shops/${shopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          owner_name: form.owner_name,
          owner_phone: form.owner_phone,
          status: form.status,
          custom_domain: form.custom_domain || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Shop updated')
        router.push('/super-admin/shops')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to update shop')
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

  if (!form) {
    return <div className="p-6 text-gray-500">Shop not found.</div>
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/super-admin/shops" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Shop</h1>
          <p className="text-sm text-gray-400">{form.owner_email}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Shop Details</h2>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Shop Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Slug *</label>
          <div className="flex items-center gap-1">
            <input
              required
              value={form.slug}
              onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <span className="text-xs text-gray-400">.ganpatibappa.com</span>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Custom Domain</label>
          <input
            type="url"
            value={form.custom_domain ?? ''}
            onChange={(e) => set('custom_domain', e.target.value)}
            placeholder="https://www.example.com"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Status *</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
            <option value="deleted">Deleted</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Owner Details</h2>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Owner Email</label>
          <input
            type="email"
            value={form.owner_email}
            disabled
            className="w-full rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-400 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">Email cannot be changed from here.</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Owner Name</label>
          <input
            value={form.owner_name ?? ''}
            onChange={(e) => set('owner_name', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Owner Phone</label>
          <input
            type="tel"
            value={form.owner_phone ?? ''}
            onChange={(e) => set('owner_phone', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Changes
      </button>
    </form>
  )
}
