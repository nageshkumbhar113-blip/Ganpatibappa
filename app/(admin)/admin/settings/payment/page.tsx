'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, CreditCard, QrCode, Building2, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PaymentData {
  upi_id: string
  upi_name: string
  account_holder_name: string
  qr_code_url: string
}

export default function PaymentSettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  const [data, setData] = useState<PaymentData>({
    upi_id: '',
    upi_name: '',
    account_holder_name: '',
    qr_code_url: '',
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
            qr_code_url: s.qr_code_url ?? '',
          })
        }
      })
      .catch(() => toast.error('Failed to load payment settings'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleQRUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    try {
      const { uploadImageDirect } = await import('@/lib/cloudinary/client-upload')
      const { url } = await uploadImageDirect(file, 'logos')
      setData((p) => ({ ...p, qr_code_url: url }))
      toast.success('QR Code uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-500" />
          Payment Settings
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Customer checkout वर हे payment details दिसतील
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
              <Label htmlFor="upi_id">UPI ID</Label>
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

        {/* QR Code Section */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <QrCode className="h-4 w-4 text-blue-600" />
            QR Code
          </h2>

          {data.qr_code_url && (
            <div className="flex items-start gap-4">
              <img
                src={data.qr_code_url}
                alt="QR Code"
                className="h-32 w-32 rounded-xl border border-gray-200 object-contain bg-white p-1"
              />
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Current QR Code</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setData((p) => ({ ...p, qr_code_url: '' }))}
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{data.qr_code_url ? 'Replace QR Code' : 'Upload QR Code'}</Label>
            <label className="flex items-center gap-3 w-full cursor-pointer rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-300 p-4 transition-colors">
              {isUploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-orange-500" />
              ) : (
                <QrCode className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {isUploading ? 'Uploading...' : 'Click to upload QR code image'}
                </p>
                <p className="text-xs text-gray-400">PNG, JPG — max 5MB</p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleQRUpload}
                disabled={isUploading}
              />
            </label>
            <p className="text-xs text-gray-400">
              Google Pay, PhonePe, Paytm किंवा कोणत्याही UPI app चा QR Code upload करा
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qr_url">किंवा QR Code URL paste करा</Label>
            <Input
              id="qr_url"
              value={data.qr_code_url}
              onChange={(e) => setData((p) => ({ ...p, qr_code_url: e.target.value }))}
              placeholder="https://res.cloudinary.com/..."
              type="url"
            />
          </div>
        </div>

        {/* Preview */}
        {(data.upi_id || data.qr_code_url) && (
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Customer ला असे दिसेल</p>
            <div className="flex items-center gap-3">
              {data.qr_code_url && (
                <img src={data.qr_code_url} alt="QR" className="h-16 w-16 rounded-lg border bg-white p-0.5 object-contain" />
              )}
              <div>
                {data.upi_id && (
                  <p className="text-sm font-mono font-semibold text-gray-900">{data.upi_id}</p>
                )}
                {data.upi_name && (
                  <p className="text-xs text-gray-500">{data.upi_name}</p>
                )}
                {data.account_holder_name && (
                  <p className="text-xs text-gray-400">{data.account_holder_name}</p>
                )}
              </div>
            </div>
          </div>
        )}

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
