'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Upload, MapPin } from 'lucide-react'
import { BannerManager } from '@/components/admin/settings/BannerManager'

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [isUploading, setIsUploading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')

  function captureLocation() {
    if (!navigator.geolocation) {
      setLocationError('या browser मध्ये location feature उपलब्ध नाही.')
      return
    }
    setLocationError('')
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        // A plain Google Maps query URL — no API key needed, opens the pin
        // directly, and works identically to a manually shared Maps link.
        const url = `https://www.google.com/maps?q=${latitude},${longitude}`
        setShop((s) => ({ ...s, maps_url: url }))
        setLocating(false)
        toast.success('Location सेट झालं — आता "Save" दाबा')
      },
      (err) => {
        setLocating(false)
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError('Location परवानगी नाकारली गेली. Browser settings मध्ये परवानगी द्या आणि पुन्हा प्रयत्न करा.')
        } else {
          setLocationError('Location मिळालं नाही. पुन्हा प्रयत्न करा.')
        }
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

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
      // /api/admin/settings' SettingsSchema expects a FLAT body (name,
      // whatsapp, maps_url, about_text, show_prices, ...) at the top level.
      // This used to send { shop, settings } nested — every key the schema
      // looks for was therefore undefined, Zod's blanket .optional() let it
      // through anyway, both update objects ended up empty, and the route
      // returned {success:true} having written nothing at all. This page's
      // Save button has never actually saved anything, for any shop.
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: shop.name,
          whatsapp: shop.whatsapp,
          address: shop.address,
          maps_url: shop.maps_url || null,
          logo_url: shop.logo_url || null,
          banner_url: shop.banner_url || null,
          meta_title: settings.meta_title,
          meta_description: settings.meta_description,
          about_text: settings.about_text,
          youtube_url: settings.youtube_url || null,
          show_prices: settings.show_prices,
          allow_whatsapp_order: settings.allow_whatsapp_order,
        }),
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
            दुकानाचं Location
          </label>
          {shop.maps_url ? (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <MapPin className="h-4 w-4 shrink-0 text-green-600" />
              <span className="flex-1 text-xs font-medium text-green-700">Location सेट केलंय ✅</span>
              <a href={shop.maps_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-600 hover:underline">
                पाहा
              </a>
              <button
                type="button"
                onClick={captureLocation}
                disabled={locating}
                className="text-xs font-semibold text-gray-500 hover:text-gray-700 disabled:opacity-50"
              >
                {locating ? '...' : 'पुन्हा सेट करा'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={captureLocation}
              disabled={locating}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-orange-300 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-100 disabled:opacity-50"
            >
              <MapPin className="h-4 w-4" />
              {locating ? 'Location शोधत आहे…' : '📍 सध्याचं Location सेट करा'}
            </button>
          )}
          {locationError && <p className="mt-1 text-[11px] text-red-500">{locationError}</p>}
          <p className="mt-1 text-[11px] text-gray-400">
            दुकानातूनच हे बटण दाबा — तुमच्या mobile चं GPS location आपोआप घेतलं जाईल.
            Customers shop page वरून directly तिथे navigate करू शकतील.
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

        {/* Banner (single, legacy fallback — shown only when no slideshow banners exist) */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-2">Banner Image (fallback)</label>
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
            <p className="text-[11px] text-gray-400">
              खाली slideshow banners असतील तर तेच दिसतील — हा फक्त slideshow नसेल तेव्हा fallback आहे.
            </p>
          </div>
        </div>
      </section>

      {/* Home Banners (Slideshow) */}
      <BannerManager />

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
