'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2, Phone, MapPin, MessageCircle } from 'lucide-react'

export default function ContactPage() {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/shop/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setSubmitted(true)
        toast.success('Message sent! We will contact you soon.')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to send message')
      }
    })
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <span className="text-6xl">🙏</span>
          <h2 className="text-xl font-bold text-gray-900">Message Sent!</h2>
          <p className="text-gray-500">We have received your inquiry. We will get back to you soon.</p>
          <a href="/" className="inline-block mt-2 text-orange-500 hover:underline text-sm">
            Back to Home
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Contact Us</h1>
        <p className="text-sm text-gray-500 mb-6">Send us a message and we will get back to you.</p>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Your Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ramesh Patil"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number *</label>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Email (optional)</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="ram@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Message *</label>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              placeholder="I am interested in ordering a Ganpati Murti…"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send Message
          </button>
        </form>
      </div>
    </div>
  )
}
