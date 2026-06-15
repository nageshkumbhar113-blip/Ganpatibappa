'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Loader2, Megaphone, Send } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Campaign {
  id: string
  name: string
  festival_name?: string
  message: string
  status: 'draft' | 'scheduled' | 'sent'
  push_enabled: boolean
  email_enabled: boolean
  whatsapp_enabled: boolean
  sent_count: number
  scheduled_at?: string
  created_at: string
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/campaigns')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error)
        setCampaigns(d.campaigns ?? [])
      })
      .catch(() => toast.error('Failed to load campaigns'))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSend(id: string, name: string) {
    if (!confirm(`Send campaign "${name}" now?`)) return
    setSending(id)
    const res = await fetch(`/api/admin/campaigns/${id}/send`, { method: 'POST' })
    const d = await res.json()
    setSending(null)
    if (res.ok) {
      toast.success(`Sent to ${d.sentCount} devices`)
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'sent' as const, sent_count: d.sentCount } : c))
      )
    } else {
      toast.error(d.error ?? 'Failed to send campaign')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">Festival & promotional campaigns</p>
        </div>
        <Link
          href="/admin/campaigns/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </Link>
      </div>

      {/* Premium notice */}
      <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-orange-700">
        ⭐ Campaigns are a <strong>Premium</strong> feature. Upgrade to send festival notifications, WhatsApp blasts, and email campaigns.
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No campaigns yet. Create your first festival campaign!</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Campaign</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Channels</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Sent</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    {c.festival_name && (
                      <p className="text-xs text-orange-500">{c.festival_name}</p>
                    )}
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{c.message}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {c.push_enabled && (
                        <span className="text-[10px] rounded-full bg-purple-100 text-purple-700 px-1.5 py-0.5">Push</span>
                      )}
                      {c.email_enabled && (
                        <span className="text-[10px] rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5">Email</span>
                      )}
                      {c.whatsapp_enabled && (
                        <span className="text-[10px] rounded-full bg-green-100 text-green-700 px-1.5 py-0.5">WhatsApp</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{c.sent_count}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {c.scheduled_at ? formatDate(c.scheduled_at) : formatDate(c.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.status !== 'sent' && (
                      <button
                        onClick={() => handleSend(c.id, c.name)}
                        disabled={sending === c.id}
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-60 transition-colors"
                      >
                        {sending === c.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <Send className="h-3 w-3" />
                        }
                        Send
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
