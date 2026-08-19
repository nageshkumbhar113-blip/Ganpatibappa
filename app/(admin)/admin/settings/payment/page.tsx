'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, CreditCard, QrCode, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UpiPaymentQR } from '@/components/shop/UpiPaymentQR'

interface PaymentData {
  upi_id: string
  upi_name: string
  account_holder_name: string
}

export default function PaymentSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [previewAmount, setPreviewAmount] = useState('501')

  const [data, setData] = useState<PaymentData>({
    upi_id: '',
    upi_name: '',
    account_holder_name: '',
  })

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        const s = d.shop
        if (s) {
          setData({
            upi_id: s.upi_id ?? '',
            upi_name: s.upi_name ?? '',
            account_holder_name: s.account_holder_name ?? '',
          })
        }
      })
      .catch(() => toast.error('Failed to load payment settings'))
      .finally(() => setIsLoading(false))
  }, [])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // qr_code_url explicitly cleared: this page used to let owners
        // upload a static QR screenshot, but it was never actually shown
        // to customers anywhere in the app, AND leaving it blank (the
        // common case) silently failed the entire save (empty string isn't
        // a valid URL, see lib/utils/zod-helpers.ts). Checkout now
        // generates a live UPI QR from upi_id/upi_name — always right,
        // always matches the amount due — so the upload is retired.
        body: JSON.stringify({ ...data, qr_code_url: null }),
      })
      if (res.ok) {
        toast.success('Payment settings saved!')
      } else {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? 'Save failed')
      }
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  const previewAmountNum = parseFloat(previewAmount) || 0

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-500" />
          Payment Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Customer checkout वर यावरून आपोआप QR तयार होऊन दाखवला जाईल — बरोबर त्याच amount साठी जो customer भरतोय
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* UPI Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <IndianRupee className="h-4 w-4 text-green-600" />
            UPI Payment
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="upi_id">UPI ID *</Label>
              <Input
                id="upi_id"
                value={data.upi_id}
                onChange={(e) => setData((p) => ({ ...p, upi_id: e.target.value }))}
                placeholder="yourname@upi"
              />
              <p className="text-xs text-gray-400">उदा: nagesh@paytm, 9876543210@ybl</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upi_name">UPI Display Name</Label>
              <Input
                id="upi_name"
                value={data.upi_name}
                onChange={(e) => setData((p) => ({ ...p, upi_name: e.target.value }))}
                placeholder="Nagesh Arts"
              />
              <p className="text-xs text-gray-400">Customer ला दिसणारे नाव</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="account_holder_name">Account Holder Name</Label>
            <Input
              id="account_holder_name"
              value={data.account_holder_name}
              onChange={(e) => setData((p) => ({ ...p, account_holder_name: e.target.value }))}
              placeholder="Nagesh Patil"
            />
          </div>
        </div>

        {/* Live QR Preview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="h-4 w-4 text-blue-600" />
            QR Preview
          </h2>
          {data.upi_id ? (
            <>
              <div className="space-y-1.5 max-w-[160px]">
                <Label htmlFor="preview_amount">Test Amount (₹)</Label>
                <Input
                  id="preview_amount"
                  type="number"
                  min="1"
                  value={previewAmount}
                  onChange={(e) => setPreviewAmount(e.target.value)}
                />
              </div>
              <UpiPaymentQR upiId={data.upi_id} payeeName={data.upi_name || data.account_holder_name} amount={previewAmountNum} note="Preview" />
              <p className="text-xs text-gray-400">
                हा QR स्वतः scan करून test करा — प्रत्येक order वर customer ला त्याच्या actual बाकी रकमेचा QR दिसेल, वेगळा upload करायची गरज नाही.
              </p>
            </>
          ) : (
            <p className="text-xs text-gray-400">UPI ID टाका — QR इथे लगेच दिसेल.</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending} className="bg-orange-500 hover:bg-orange-600 text-white px-8">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Payment Settings
          </Button>
        </div>
      </form>
    </div>
  )
}
