'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Save, User } from 'lucide-react'
import { getCustomerDetails, saveCustomerDetails } from '@/lib/utils/local-customer'

// There is no customer signup/login anywhere in this app (checkout is
// guest-only), so this isn't an account profile — it's a browser-local
// "remember my details" that prefills checkout next time.
export default function MyDetailsPage() {
  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm(getCustomerDetails(window.location.hostname))
  }, [])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    saveCustomerDetails(window.location.hostname, form)
    setSaved(true)
    toast.success('Saved — checkout will auto-fill next time')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <User className="h-10 w-10 mx-auto text-orange-400 mb-2" />
          <h1 className="text-xl font-bold text-gray-900">My Details</h1>
          <p className="text-sm text-gray-500 mt-1">Checkout will auto-fill from this next time</p>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Ramesh Patil"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone Number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="9876543210"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              placeholder="Street, City, Pincode…"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 flex items-center justify-center gap-2 transition-colors"
          >
            <Save className="h-4 w-4" /> {saved ? 'Saved ✅' : 'Save'}
          </button>
        </form>
      </div>
    </div>
  )
}
