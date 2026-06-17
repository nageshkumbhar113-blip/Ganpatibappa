'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, MessageCircle, Mail, Bell } from 'lucide-react'

export default function CommunicationPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [form, setForm] = useState({
    whatsapp: '',
    whatsapp_notify_order: true,
    whatsapp_notify_payment: true,
    contact_email: '',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings').then((r) => r.json()),
    ]).then(([d]) => {
      if (d.shop) setForm((f) => ({ ...f, whatsapp: d.shop.whatsapp ?? '' }))
      if (d.settings) {
        setForm((f) => ({
          ...f,
          whatsapp_notify_order: d.settings.whatsapp_notify_order !== false,
          whatsapp_notify_payment: d.settings.whatsapp_notify_payment !== false,
          contact_email: d.settings.contact_email ?? '',
        }))
      }
    }).catch(() => toast.error('Failed to load'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop: { whatsapp: form.whatsapp },
          settings: {
            contact_email: form.contact_email,
            whatsapp_notify_order: form.whatsapp_notify_order,
            whatsapp_notify_payment: form.whatsapp_notify_payment,
          },
        }),
      })
      if (res.ok) toast.success('Communication settings saved!')
      else toast.error('Failed to save')
    })
  }

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
    </div>
  )

  return (
    <form onSubmit={handleSave} className="p-6 max-w-xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Communication Settings</h1>
          <p className="text-sm text-gray-500">WhatsApp आणि Email notification settings</p>
        </div>
        <button type="submit" disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-green-600" />
          <h2 className="text-sm font-bold text-gray-900">WhatsApp</h2>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">WhatsApp Number</label>
          <input value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="919876543210 (country code सह)" />
          <p className="mt-1 text-[11px] text-gray-400">Country code सह टाका — e.g. 91 for India. Customers WhatsApp वर direct order करू शकतात.</p>
        </div>

        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold text-gray-600">Notifications</p>
          {[
            { key: 'whatsapp_notify_order', label: 'नवीन Order आल्यावर WhatsApp notification' },
            { key: 'whatsapp_notify_payment', label: 'Payment screenshot आल्यावर notification' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only"
                  checked={form[key as keyof typeof form] as boolean}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />
                <div className={`w-10 h-6 rounded-full transition-colors ${form[key as keyof typeof form] ? 'bg-green-500' : 'bg-gray-200'}`}>
                  <div className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${form[key as keyof typeof form] ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </div>
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Email */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-blue-500" />
          <h2 className="text-sm font-bold text-gray-900">Email</h2>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-700 block mb-1">Contact Email</label>
          <input type="email" value={form.contact_email} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="shop@example.com" />
          <p className="mt-1 text-[11px] text-gray-400">Customer inquiries आणि order confirmations या email ला येतील</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-2">
        <Bell className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-700">
          <p className="font-semibold mb-0.5">Push Notifications</p>
          <p>Firebase FCM setup साठी <a href="/admin/notifications" className="underline font-medium">Notifications page</a> वर जा</p>
        </div>
      </div>
    </form>
  )
}
