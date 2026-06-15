'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, Loader2 } from 'lucide-react'

const FESTIVALS = [
  'Ganesh Chaturthi', 'Diwali', 'Holi', 'Navratri', 'Dussehra',
  'Makar Sankranti', 'Gudi Padwa', 'Akshaya Tritiya', 'New Year',
]

export default function CreateCampaignPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: '',
    festival_name: '',
    message: '',
    image_url: '',
    target_audience: 'all' as 'all' | 'customers' | 'subscribers',
    push_enabled: true,
    email_enabled: false,
    whatsapp_enabled: false,
    scheduled_at: '',
  })

  const set = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          image_url: form.image_url || undefined,
          festival_name: form.festival_name || undefined,
          scheduled_at: form.scheduled_at || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Campaign created')
        router.push('/admin/campaigns')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to create campaign')
      }
    })
  }

  const Toggle = ({ label, field }: { label: string; field: keyof typeof form }) => (
    <label className="flex items-center justify-between gap-4 cursor-pointer">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => set(field, !form[field])}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${form[field] ? 'bg-orange-500' : 'bg-gray-200'}`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${form[field] ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  )

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5 max-w-xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/campaigns" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">New Campaign</h1>
      </div>

      {/* Campaign details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Campaign Details</h2>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Campaign Name *</label>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="e.g. Ganesh Chaturthi 2026 Offer"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Festival (optional)</label>
          <select
            value={form.festival_name}
            onChange={(e) => set('festival_name', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Select a festival…</option>
            {FESTIVALS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Message *</label>
          <textarea
            required
            rows={4}
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            maxLength={500}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            placeholder="🙏 Ganesh Chaturthi special offer! Get 20% off on all Eco-Friendly Murtis. Limited stock available…"
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{form.message.length}/500</p>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Image URL (optional)</label>
          <input
            type="url"
            value={form.image_url}
            onChange={(e) => set('image_url', e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="https://…"
          />
        </div>
      </div>

      {/* Target & Channels */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Target Audience</h2>

        <div className="flex gap-2">
          {(['all', 'customers', 'subscribers'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set('target_audience', t)}
              className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                form.target_audience === t
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {t === 'all' ? 'All Users' : t === 'customers' ? 'Customers' : 'Newsletter'}
            </button>
          ))}
        </div>

        <h2 className="text-sm font-bold text-gray-900 pt-1">Send Via</h2>
        <Toggle label="Push Notification" field="push_enabled" />
        <Toggle label="Email" field="email_enabled" />
        <Toggle label="WhatsApp" field="whatsapp_enabled" />
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Schedule (optional)</h2>
        <p className="text-xs text-gray-400">Leave blank to save as draft and send manually.</p>
        <input
          type="datetime-local"
          value={form.scheduled_at}
          onChange={(e) => set('scheduled_at', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {form.scheduled_at ? 'Schedule Campaign' : 'Save as Draft'}
      </button>
    </form>
  )
}
