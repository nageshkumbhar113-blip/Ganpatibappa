'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

export default function MarketingPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [form, setForm] = useState({
    google_analytics_id: '',
    google_search_console: '',
    facebook_pixel_id: '',
    og_image_url: '',
    custom_robots: '',
  })

  useEffect(() => {
    fetch('/api/admin/marketing')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setForm({
            google_analytics_id: d.settings.google_analytics_id ?? '',
            google_search_console: d.settings.google_search_console ?? '',
            facebook_pixel_id: d.settings.facebook_pixel_id ?? '',
            og_image_url: d.settings.og_image_url ?? '',
            custom_robots: d.settings.custom_robots ?? '',
          })
        }
      })
      .catch(() => toast.error('Failed to load marketing settings'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/marketing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Marketing settings saved')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to save')
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

  const Field = ({
    label, name, placeholder, hint,
  }: { label: string; name: keyof typeof form; placeholder: string; hint?: string }) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      <input
        value={form[name]}
        onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        placeholder={placeholder}
      />
      {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )

  return (
    <form onSubmit={handleSave} className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Marketing & SEO</h1>
          <p className="text-sm text-gray-500">Analytics, tracking, and search engine settings</p>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Google</h2>
        <Field
          label="Google Analytics Measurement ID"
          name="google_analytics_id"
          placeholder="G-XXXXXXXXXX"
          hint="Found in Google Analytics → Admin → Data Streams"
        />
        <Field
          label="Google Search Console Verification"
          name="google_search_console"
          placeholder="<meta name='google-site-verification' content='...' />"
          hint="Paste the full meta tag from Google Search Console"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Facebook</h2>
        <Field
          label="Facebook Pixel ID"
          name="facebook_pixel_id"
          placeholder="123456789012345"
          hint="Found in Facebook Business Manager → Events Manager"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Social Sharing</h2>
        <Field
          label="Default OG Image URL"
          name="og_image_url"
          placeholder="https://…"
          hint="1200×630px image shown when your shop is shared on social media"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Custom Robots.txt</h2>
        <p className="text-xs text-gray-400">Leave blank to use default (allow all, disallow /admin /api)</p>
        <textarea
          rows={6}
          value={form.custom_robots}
          onChange={(e) => setForm((f) => ({ ...f, custom_robots: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          placeholder={`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: https://yourshop.com/sitemap.xml`}
        />
      </div>

      <button
        type="submit"
        disabled={isSaving}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Marketing Settings
      </button>
    </form>
  )
}
