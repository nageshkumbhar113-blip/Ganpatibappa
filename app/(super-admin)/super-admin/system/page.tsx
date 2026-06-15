'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Server, ShoppingBag, Package, Users, Image, FileText, Activity } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface SystemStats {
  totalShops: number
  activeShops: number
  totalOrders: number
  totalProducts: number
  totalCustomers: number
  totalGalleryImages: number
  totalReviews: number
  recentErrors?: Array<{ message: string; created_at: string }>
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

export default function SystemPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/super-admin/system')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error)
        setStats(d.stats ?? null)
      })
      .catch(() => toast.error('Failed to load system stats'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">System Overview</h1>
        <p className="text-sm text-gray-500">Platform-wide health metrics</p>
      </div>

      {/* Platform health badge */}
      <div className="inline-flex items-center gap-2 rounded-full bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700">
        <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
        All systems operational
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={ShoppingBag} label="Total Shops" value={stats.totalShops} color="bg-orange-50 text-orange-600" />
        <StatCard icon={Activity} label="Active Shops" value={stats.activeShops} color="bg-green-50 text-green-600" />
        <StatCard icon={FileText} label="Total Orders" value={stats.totalOrders} color="bg-blue-50 text-blue-600" />
        <StatCard icon={Package} label="Total Products" value={stats.totalProducts} color="bg-purple-50 text-purple-600" />
        <StatCard icon={Users} label="Total Customers" value={stats.totalCustomers} color="bg-pink-50 text-pink-600" />
        <StatCard icon={Image} label="Gallery Images" value={stats.totalGalleryImages} color="bg-yellow-50 text-yellow-600" />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <a
          href="/super-admin/system/logs"
          className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 hover:border-orange-200 transition-colors"
        >
          <Server className="h-5 w-5 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Audit Logs</p>
          <p className="text-xs text-gray-400">View system-wide audit trail</p>
        </a>
        <a
          href="/super-admin/shops"
          className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 hover:border-orange-200 transition-colors"
        >
          <ShoppingBag className="h-5 w-5 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Manage Shops</p>
          <p className="text-xs text-gray-400">View and manage all shops</p>
        </a>
        <a
          href="/super-admin/subscriptions"
          className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 hover:border-orange-200 transition-colors"
        >
          <FileText className="h-5 w-5 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-900">Subscriptions</p>
          <p className="text-xs text-gray-400">Manage billing & plans</p>
        </a>
      </div>
    </div>
  )
}
