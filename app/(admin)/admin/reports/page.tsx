'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, TrendingUp, ShoppingBag, Users, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface DailyStat {
  day: string
  revenue: number
  orders: number
}

interface MonthlyData {
  totalRevenue: number
  totalOrders: number
  newCustomers: number
  dailyStats: DailyStat[]
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string
  sub?: string
  icon: any
  color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

// Simple bar chart using CSS
function BarChart({ data }: { data: DailyStat[] }) {
  if (!data.length) return null
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1)

  return (
    <div className="flex items-end gap-1 h-32 overflow-x-auto pb-2">
      {data.map((d) => {
        const height = Math.max((d.revenue / maxRevenue) * 100, 2)
        return (
          <div key={d.day} className="flex flex-col items-center gap-1 min-w-[24px] flex-1">
            <div
              className="w-full bg-orange-400 rounded-t-sm hover:bg-orange-500 transition-colors cursor-default"
              style={{ height: `${height}%` }}
              title={`${formatDate(d.day)}: ${formatCurrency(d.revenue)}`}
            />
            <span className="text-[9px] text-gray-400 rotate-45 origin-left whitespace-nowrap">
              {new Date(d.day).getDate()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function ReportsPage() {
  const [monthly, setMonthly] = useState<MonthlyData | null>(null)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/reports/monthly?year=${year}&month=${month}`).then((r) => r.json()),
      fetch('/api/admin/orders?page=1').then((r) => r.json()),
    ])
      .then(([monthData, ordersData]) => {
        setMonthly(monthData)
        setRecentOrders(ordersData.orders?.slice(0, 5) ?? [])
      })
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setIsLoading(false))
  }, [])

  async function exportOrders() {
    setIsExporting(true)
    const res = await fetch('/api/admin/reports/export?type=orders')
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orders-${year}-${String(month).padStart(2, '0')}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      const d = await res.json()
      toast.error(d.error ?? 'Export failed')
    }
    setIsExporting(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">
            {now.toLocaleString('default', { month: 'long' })} {year}
          </p>
        </div>
        <button
          onClick={exportOrders}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Export Orders
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Monthly Revenue"
          value={formatCurrency(monthly?.totalRevenue ?? 0)}
          icon={TrendingUp}
          color="bg-orange-50 text-orange-500"
        />
        <StatCard
          label="Total Orders"
          value={String(monthly?.totalOrders ?? 0)}
          sub={`${month}/${year}`}
          icon={ShoppingBag}
          color="bg-blue-50 text-blue-500"
        />
        <StatCard
          label="New Customers"
          value={String(monthly?.newCustomers ?? 0)}
          sub="This month"
          icon={Users}
          color="bg-green-50 text-green-500"
        />
      </div>

      {/* Revenue Chart */}
      {monthly?.dailyStats && monthly.dailyStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Daily Revenue — {now.toLocaleString('default', { month: 'long' })}</h2>
          <BarChart data={monthly.dailyStats} />
          <div className="mt-3 flex justify-between text-xs text-gray-400">
            <span>1</span>
            <span>{new Date(year, month, 0).getDate()}</span>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900">Recent Orders</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Order</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-2.5 text-right font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.map((o: any) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">#{o.order_number}</td>
                  <td className="px-4 py-2.5 text-gray-600">{o.customer_name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(o.total_amount)}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDate(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
