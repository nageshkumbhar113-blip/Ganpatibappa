'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, MessageSquare, Eye } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface Inquiry {
  id: string
  name: string
  phone: string
  email?: string
  message: string
  status: 'new' | 'read' | 'replied' | 'closed'
  created_at: string
  products?: { name: string }
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-orange-100 text-orange-700',
  read: 'bg-blue-100 text-blue-700',
  replied: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Inquiry | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isSending, setIsSending] = useState(false)

  function load() {
    const q = filter ? `?status=${filter}` : ''
    fetch(`/api/admin/inquiries${q}`)
      .then((r) => r.json())
      .then((d) => setInquiries(d.inquiries ?? []))
      .catch(() => toast.error('Failed to load inquiries'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { load() }, [filter])

  async function openDetail(inquiry: Inquiry) {
    setSelected(inquiry)
    setReplyText('')
    // Mark as read
    if (inquiry.status === 'new') {
      await fetch(`/api/admin/inquiries/${inquiry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'read' }),
      })
      setInquiries((prev) =>
        prev.map((i) => (i.id === inquiry.id ? { ...i, status: 'read' as const } : i))
      )
    }
  }

  async function sendReply() {
    if (!selected || !replyText.trim()) return
    setIsSending(true)
    const res = await fetch(`/api/admin/inquiries/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'replied', reply: replyText }),
    })
    setIsSending(false)
    if (res.ok) {
      toast.success('Reply sent')
      setInquiries((prev) =>
        prev.map((i) => (i.id === selected.id ? { ...i, status: 'replied' as const } : i))
      )
      setSelected(null)
    } else {
      toast.error('Failed to send reply')
    }
  }

  async function closeInquiry(id: string) {
    await fetch(`/api/admin/inquiries/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'closed' }),
    })
    setInquiries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: 'closed' as const } : i))
    )
    setSelected(null)
    toast.success('Inquiry closed')
  }

  const newCount = inquiries.filter((i) => i.status === 'new').length

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Inquiries</h1>
          <p className="text-sm text-gray-500">
            {inquiries.length} total{newCount > 0 && ` · `}
            {newCount > 0 && <span className="text-orange-600 font-semibold">{newCount} new</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {['', 'new', 'read', 'replied', 'closed'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                filter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : inquiries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No inquiries yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">From</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Message</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Product</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inquiries.map((inq) => (
                <tr
                  key={inq.id}
                  className={`hover:bg-gray-50 transition-colors ${inq.status === 'new' ? 'bg-orange-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    <p className={`font-medium ${inq.status === 'new' ? 'text-gray-900' : 'text-gray-700'}`}>
                      {inq.name}
                    </p>
                    <p className="text-xs text-gray-400">{inq.phone}</p>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-gray-600 line-clamp-2 text-xs">{inq.message}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {inq.products?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inq.status]}`}>
                      {inq.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(inq.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openDetail(inq)}
                      className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Inquiry from {selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="space-y-1 text-sm">
              <p><span className="text-gray-400">Phone:</span> <a href={`tel:${selected.phone}`} className="text-orange-500">{selected.phone}</a></p>
              {selected.email && <p><span className="text-gray-400">Email:</span> {selected.email}</p>}
              {selected.products?.name && <p><span className="text-gray-400">Product:</span> {selected.products.name}</p>}
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              {selected.message}
            </div>

            {/* WhatsApp Reply */}
            <a
              href={`https://wa.me/${selected.phone.replace(/\D/g, '')}?text=Hello ${selected.name}, thank you for your inquiry.`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-semibold text-white hover:bg-green-600 transition-colors"
            >
              <span>📱</span> Reply on WhatsApp
            </a>

            {/* Internal note */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Internal Note / Reply</label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                placeholder="Add a note or reply…"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => closeInquiry(selected.id)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={sendReply}
                disabled={isSending || !replyText.trim()}
                className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
              >
                {isSending ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Mark Replied'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
