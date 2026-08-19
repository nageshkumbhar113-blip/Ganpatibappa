'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, Download, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// This page didn't exist at all -- the shop detail page's "Backup &
// Clone" Quick Action linked to this exact URL and 404'd for every
// super admin who ever clicked it. The backup/clone APIs themselves
// were already correct; only the UI to reach them was missing.
export default function ShopBackupPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [shopName, setShopName] = useState('')
  const [isDownloading, startDownload] = useTransition()
  const [isCloning, startClone] = useTransition()
  const [plans, setPlans] = useState<{ id: string; display_name: string }[]>([])

  const [cloneForm, setCloneForm] = useState({
    newSlug: '',
    newShopName: '',
    ownerEmail: '',
    ownerName: '',
    ownerPassword: '',
    planId: '',
  })

  useEffect(() => {
    fetch(`/api/super-admin/shops/${shopId}`)
      .then((r) => r.json())
      .then((d) => {
        setShopName(d.shop?.name ?? '')
        setCloneForm((f) => ({ ...f, newShopName: `${d.shop?.name ?? ''} (Copy)` }))
      })
      .catch(() => {})
    fetch('/api/super-admin/plans')
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans ?? [])
        if (d.plans?.[0]) setCloneForm((f) => ({ ...f, planId: d.plans[0].id }))
      })
      .catch(() => {})
  }, [shopId])

  function handleDownload() {
    startDownload(async () => {
      const res = await fetch(`/api/super-admin/shops/${shopId}/backup`, { method: 'POST' })
      if (!res.ok) {
        toast.error('Backup failed')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `shop-backup-${shopId}-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded')
    })
  }

  function handleClone(e: React.FormEvent) {
    e.preventDefault()
    startClone(async () => {
      const res = await fetch(`/api/super-admin/shops/${shopId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cloneForm),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success('Shop cloned')
        router.push(`/super-admin/shops/${d.newShopId}`)
      } else {
        toast.error(d.error?.formErrors?.join?.(', ') ?? d.error ?? 'Clone failed')
      }
    })
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl overflow-y-auto">
      <Link href={`/super-admin/shops/${shopId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ChevronLeft className="h-4 w-4" /> Back to Shop
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Backup & Clone — {shopName}</h1>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Download className="h-4 w-4 text-blue-500" /> Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">Shop, settings, categories, products, gallery, WhatsApp templates — सगळं एका JSON file मध्ये download होईल.</p>
          <Button onClick={handleDownload} disabled={isDownloading} className="bg-blue-500 hover:bg-blue-600 text-white">
            {isDownloading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Download className="h-4 w-4 mr-1.5" />}
            Download Backup
          </Button>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Copy className="h-4 w-4 text-green-500" /> Clone This Shop</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleClone} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">New Shop Name</Label>
                <Input required value={cloneForm.newShopName} onChange={(e) => setCloneForm((f) => ({ ...f, newShopName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Slug</Label>
                <Input required pattern="[a-z0-9-]+" placeholder="new-shop-slug" value={cloneForm.newSlug} onChange={(e) => setCloneForm((f) => ({ ...f, newSlug: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Owner Name</Label>
                <Input required value={cloneForm.ownerName} onChange={(e) => setCloneForm((f) => ({ ...f, ownerName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Owner Email</Label>
                <Input required type="email" value={cloneForm.ownerEmail} onChange={(e) => setCloneForm((f) => ({ ...f, ownerEmail: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">New Owner Password</Label>
                <Input required type="text" minLength={8} value={cloneForm.ownerPassword} onChange={(e) => setCloneForm((f) => ({ ...f, ownerPassword: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Plan</Label>
                <select
                  required
                  value={cloneForm.planId}
                  onChange={(e) => setCloneForm((f) => ({ ...f, planId: e.target.value }))}
                  className="w-full h-9 rounded-md border border-gray-200 px-3 text-sm"
                >
                  <option value="">Select plan…</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{p.display_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" disabled={isCloning} className="bg-green-500 hover:bg-green-600 text-white">
              {isCloning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Copy className="h-4 w-4 mr-1.5" />}
              Clone Shop
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
