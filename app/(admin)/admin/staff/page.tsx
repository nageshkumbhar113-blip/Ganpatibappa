'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus, Users, Loader2, Shield, ToggleLeft, ToggleRight } from 'lucide-react'

interface StaffMember {
  id: string
  user_id: string
  role: string
  is_active: boolean
  permissions: Record<string, boolean>
  users: {
    full_name: string
    email: string
    phone?: string
  }
}

const PERMISSIONS = [
  { key: 'manage_products', label: 'Products' },
  { key: 'manage_orders', label: 'Orders' },
  { key: 'manage_customers', label: 'Customers' },
  { key: 'view_reports', label: 'Reports' },
  { key: 'manage_marketing', label: 'Marketing' },
]

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    permissions: {} as Record<string, boolean>,
  })

  function loadStaff() {
    fetch('/api/admin/staff')
      .then((r) => r.json())
      .then((d) => setStaff(d.staff ?? []))
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setIsLoading(false))
  }

  useEffect(() => { loadStaff() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast.success('Staff member invited')
        setShowInvite(false)
        setForm({ full_name: '', email: '', phone: '', password: '', role: 'staff', permissions: {} })
        loadStaff()
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to invite staff')
      }
    })
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (res.ok) {
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s))
      )
      toast.success(current ? 'Staff deactivated' : 'Staff activated')
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500">{staff.length} members</p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Invite Staff
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No staff members yet. Invite someone to get started.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Member</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Permissions</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{member.users?.full_name}</p>
                    <p className="text-xs text-gray-400">{member.users?.email}</p>
                    {member.users?.phone && (
                      <p className="text-xs text-gray-400">{member.users.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                      <Shield className="h-3 w-3" />
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {PERMISSIONS
                        .filter((p) => member.permissions?.[p.key])
                        .map((p) => (
                          <span key={p.key} className="rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px]">
                            {p.label}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(member.id, member.is_active)}
                      className="text-gray-400 hover:text-orange-500 transition-colors"
                    >
                      {member.is_active
                        ? <ToggleRight className="h-5 w-5 text-green-500" />
                        : <ToggleLeft className="h-5 w-5" />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Invite Staff Member</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <form onSubmit={handleInvite} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Full Name *</label>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Password *</label>
                <input
                  required
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Permissions</label>
                <div className="space-y-1.5">
                  {PERMISSIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.permissions[p.key]}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            permissions: { ...f.permissions, [p.key]: e.target.checked },
                          }))
                        }
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                      />
                      <span className="text-sm text-gray-700">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
