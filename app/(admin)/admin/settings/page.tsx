'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Upload } from 'lucide-react'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  const [shop, setShop] = useState({
    name: '',
    whatsapp: '',
    address: '',
    maps_url: '',
    logo_url: '',
    banner_url: '',
  })

  const [settings, setSettings] = useState({
    meta_title: '',
    meta_description: '',
    about_text: '',
    youtube_url: '',
    show_prices: true,
    allow_whatsapp_order: true,
    show_stock: true,
    currency: 'INR',
    upi_id: '',
    bank_account: '',
    bank_ifsc: '',
    whatsapp_notify_order: true,
    whatsapp_notify_payment: true,
  })

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        const { shop: s, settings: st } = d
        if (s) {
          setShop({
            name: s.name ?? '',
            whatsapp: s.whatsapp ?? '',
            address: s.address ?? '',
            maps_url: s.maps_url ?? '',
            logo_url: s.logo_url ?? '',
            banner_url: s.banner_url ?? '',
          })
        }
        if (st) {
          setSettings((prev) => ({
            ...prev,
            meta_title: st.meta_title ?? '',
            meta_description: st.meta_description ?? '',
            about_text: st.about_text ?? '',
            youtube_url: st.youtube_url ?? '',
            show_prices: st.show_prices !== false,
            allow_whatsapp_order: st.allow_whatsapp_order !== false,
            show_stock: st.show_stock !== false,
            currency: st.currency ?? 'INR',
            upi_id: st.upi_id ?? '',
            bank_account: st.bank_account ?? '',
            bank_ifsc: st.bank_ifsc ?? '',
            whatsapp_notify_order: st.whatsapp_notify_order !== false,
            whatsapp_notify_payment: st.whatsapp_notify_payment !== false,
          }))
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setIsLoading(false))
  }, [])

  async function uploadImage(file: File, field: 'logo_url' | 'banner_url') {
    setIsUploading(true)
    try {
      const { uploadImageDirect } = await import('@/lib/cloudinary/client-upload')
      const folder = field === 'logo_url' ? 'logos' : 'banners'
      const { url } = await uploadImageDirect(file, folder)
      setShop((s) => ({ ...s, [field]: url }))
      toast.success('Image uploaded')
    } catch (err: any) {
      toast.error(err?.message ?? 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shop, settings }),
      })
      if (res.ok) {
        toast.success('Settings saved')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save settings')
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

  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-orange-500' : 'bg-gray-200'}`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </label>
  )

  return (
    <form onSubmit={handleSave} className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      {/* Shop Info */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Shop Information</h2>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Shop Name *</label>
          <input
            required
            value={shop.name}
            onChange={(e) => setShop((s) => ({ ...s, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">WhatsApp Number</label>
          <input
            type="tel"
            value={shop.whatsapp}
            onChange={(e) => setShop((s) => ({ ...s, whatsapp: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="919876543210"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
          <textarea
            rows={2}
            value={shop.address}
            onChange={(e) => setShop((s) => ({ ...s, address: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            placeholder="दुकानाचा पत्ता टाका"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Google Maps Location URL
          </label>
          <input
            type="url"
            value={shop.maps_url}
            onChange={(e) => setShop((s) => ({ ...s, maps_url: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="https://maps.app.goo.gl/..."
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Google Maps मध्ये दुकान शोधा → Share → Copy Link → इथे paste करा.
            Customers shop page वरून directly navigate करू शकतील.
          </p>
        </div>

        {/* Logo */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Logo</label>
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt="Logo" className="h-12 w-12 rounded-lg object-cover border border-gray-100" />
            ) : (
              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl">🙏</div>
            )}
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              Change Logo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo_url')}
              />
            </label>
          </div>
        </div>

        {/* Banner */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Banner Image</label>
          <div className="space-y-2">
            {shop.banner_url && (
              <img src={shop.banner_url} alt="Banner" className="h-24 w-full rounded-lg object-cover border border-gray-100" />
            )}
            <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              <Upload className="h-3.5 w-3.5" />
              {shop.banner_url ? 'Change Banner' : 'Upload Banner'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], 'banner_url')}
              />
            </label>
          </div>
        </div>
      </section>

      {/* Store Settings */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Store Settings</h2>
        <Toggle
          label="Show prices on product pages"
          checked={settings.show_prices}
          onChange={(v) => setSettings((s) => ({ ...s, show_prices: v }))}
        />
        <Toggle
          label="Allow WhatsApp orders"
          checked={settings.allow_whatsapp_order}
          onChange={(v) => setSettings((s) => ({ ...s, allow_whatsapp_order: v }))}
        />
        <Toggle
          label="Show stock quantity"
          checked={settings.show_stock}
          onChange={(v) => setSettings((s) => ({ ...s, show_stock: v }))}
        />
      </section>

      {/* About & SEO */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">About & SEO</h2>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">About Us Text</label>
          <textarea
            rows={4}
            value={settings.about_text}
            onChange={(e) => setSettings((s) => ({ ...s, about_text: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            placeholder="Tell customers about your shop…"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">YouTube Video URL</label>
          <input
            type="url"
            value={settings.youtube_url}
            onChange={(e) => setSettings((s) => ({ ...s, youtube_url: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <p className="mt-1 text-[11px] text-gray-400">हे video shop page वर customers ला दिसेल. YouTube वरून Share → Copy link.</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Meta Title</label>
          <input
            value={settings.meta_title}
            onChange={(e) => setSettings((s) => ({ ...s, meta_title: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="Shop Name — Ganesh Murti Online"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Meta Description</label>
          <textarea
            rows={2}
            value={settings.meta_description}
            onChange={(e) => setSettings((s) => ({ ...s, meta_description: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>
      </section>

      {/* Payment */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Payment Details</h2>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">UPI ID</label>
          <input
            value={settings.upi_id}
            onChange={(e) => setSettings((s) => ({ ...s, upi_id: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="yourname@upi"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Bank Account</label>
            <input
              value={settings.bank_account}
              onChange={(e) => setSettings((s) => ({ ...s, bank_account: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">IFSC Code</label>
            <input
              value={settings.bank_ifsc}
              onChange={(e) => setSettings((s) => ({ ...s, bank_ifsc: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
        <Toggle
          label="WhatsApp notification on new order"
          checked={settings.whatsapp_notify_order}
          onChange={(v) => setSettings((s) => ({ ...s, whatsapp_notify_order: v }))}
        />
        <Toggle
          label="WhatsApp notification on payment"
          checked={settings.whatsapp_notify_payment}
          onChange={(v) => setSettings((s) => ({ ...s, whatsapp_notify_payment: v }))}
        />
      </section>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save All Settings
      </button>
    </form>
  )
}
