'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Bell, Send } from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'

export default function NotificationsPage() {
  const [shopId, setShopId] = useState<string>('')
  const { permission, isSubscribed, isLoading: subLoading, subscribe } = useNotifications(shopId)
  const [isSending, startTransition] = useTransition()

  const [form, setForm] = useState({
    title: '',
    body: '',
    target: 'all' as 'all' | 'customers' | 'admins',
    url: '',
  })

  // Get shopId from profile API
  useState(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => setShopId(d.shop?.id ?? ''))
      .catch(() => {})
  })

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.body) {
      toast.error('Title and body are required')
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (res.ok) {
        toast.success(`Sent to ${d.sent} devices`)
        setForm({ title: '', body: '', target: 'all', url: '' })
      } else {
        toast.error(d.error ?? 'Failed to send notification')
      }
    })
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Push Notifications</h1>
        <p className="text-sm text-gray-500">Send push notifications to your customers</p>
      </div>

      {/* Your subscription status */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Your Browser Notifications</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${isSubscribed ? 'bg-green-400' : permission === 'denied' ? 'bg-red-400' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-700">
              {isSubscribed ? 'Subscribed — you will receive notifications' :
               permission === 'denied' ? 'Blocked — enable in browser settings' :
               'Not subscribed'}
            </span>
          </div>
          {!isSubscribed && permission !== 'denied' && (
            <button
              onClick={subscribe}
              disabled={subLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {subLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Send Notification */}
      <form onSubmit={handleSend} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900">Send Push Notification</h2>
        <p className="text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
          ⭐ Premium feature — requires Premium plan
        </p>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Send To</label>
          <div className="flex gap-2">
            {(['all', 'customers', 'admins'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((f) => ({ ...f, target: t }))}
                className={`flex-1 rounded-lg border py-2 text-xs font-medium capitalize transition-colors ${
                  form.target === t
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {t === 'all' ? 'All Users' : t === 'customers' ? 'Customers Only' : 'Admins Only'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="New arrival! 🙏"
            maxLength={100}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Message *</label>
          <textarea
            required
            rows={3}
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            placeholder="Check out our new Ganpati Murti collection…"
            maxLength={200}
          />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Click URL (optional)</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="/products"
          />
        </div>

        <button
          type="submit"
          disabled={isSending}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send Notification
        </button>
      </form>
    </div>
  )
}
