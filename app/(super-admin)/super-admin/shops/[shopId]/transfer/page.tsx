'use client'

import { useEffect, useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Loader2, ArrowRightLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// This page didn't exist at all -- the shop detail page's "Transfer
// Shop" Quick Action linked to this exact URL and 404'd for every
// super admin who ever clicked it. The transfer API itself was already
// correct (and already fixed for sequential writes); only the UI to
// reach it was missing.
export default function ShopTransferPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const [shopName, setShopName] = useState('')
  const [currentOwnerEmail, setCurrentOwnerEmail] = useState('')
  const [newOwnerEmail, setNewOwnerEmail] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    fetch(`/api/super-admin/shops/${shopId}`)
      .then((r) => r.json())
      .then((d) => {
        setShopName(d.shop?.name ?? '')
        setCurrentOwnerEmail(d.shop?.owner_email ?? '')
      })
      .catch(() => {})
  }, [shopId])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch(`/api/super-admin/shops/${shopId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerEmail }),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success('Shop transferred')
        router.push(`/super-admin/shops/${shopId}`)
      } else {
        toast.error(d.error ?? 'Transfer failed')
      }
    })
  }

  return (
    <div className="p-6 space-y-5 max-w-lg overflow-y-auto">
      <Link href={`/super-admin/shops/${shopId}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ChevronLeft className="h-4 w-4" /> Back to Shop
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Transfer Shop — {shopName}</h1>
        <p className="text-sm text-gray-500 mt-1">Ownership दुसऱ्या already-existing admin account कडे हलवा</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4 text-purple-500" /> New Owner</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Current Owner</Label>
              <Input value={currentOwnerEmail} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">New Owner's Email</Label>
              <Input
                required
                type="email"
                value={newOwnerEmail}
                onChange={(e) => setNewOwnerEmail(e.target.value)}
                placeholder="already an admin/super_admin account"
              />
              <p className="text-[11px] text-gray-400">हा user आधीच admin किंवा super_admin असणे गरजेचे आहे — नवीन account इथून बनत नाही.</p>
            </div>
            <Button type="submit" disabled={isPending} className="bg-purple-500 hover:bg-purple-600 text-white">
              {isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ArrowRightLeft className="h-4 w-4 mr-1.5" />}
              Transfer Shop
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
