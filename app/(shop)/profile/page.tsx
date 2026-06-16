'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, startTransition] = useTransition()
  const [form, setForm] = useState({ name: '', phone: '' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push('/login')
        return
      }
      setUser(data.user)

      supabase
        .from('users')
        .select('name, phone')
        .eq('id', data.user.id)
        .single()
        .then(({ data: p }) => {
          if (p) {
            setProfile(p)
            setForm({ name: p.name ?? '', phone: p.phone ?? '' })
          }
        })
        .finally(() => setIsLoading(false))
    })
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const { error } = await supabase
        .from('users')
        .update({ name: form.name, phone: form.phone })
        .eq('id', user.id)

      if (error) {
        toast.error('Failed to update profile')
      } else {
        toast.success('Profile updated')
      }
    })
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <User className="h-8 w-8 text-orange-500" />
          </div>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Edit Profile</h2>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              placeholder="9876543210"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </form>

        {/* Quick links */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
          {[
            { href: '/orders', label: 'My Orders' },
            { href: '/wishlist', label: 'My Wishlist' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {link.label}
              <span className="text-gray-300">›</span>
            </a>
          ))}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-200 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  )
}
