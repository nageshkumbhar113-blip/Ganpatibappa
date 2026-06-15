'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface CustomerStat {
  name: string
  phone: string
  totalSpent: number
  orderCount: number
}

export default function CustomersReportPage() {
  const [customers, setCustomers] = useState<CustomerStat[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/reports/customers?limit=20')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error)
        setCustomers(d.customers ?? [])
      })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setIsLoading(false))
  }, [])

  const maxSpent = customers[0]?.totalSpent ?? 1

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Top Customers by Spend</h1>
        <p className="text-sm text-gray-500">सर्वात जास्त खर्च केलेले customers</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No customer data yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Rank</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Orders</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total Spent</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-40">Bar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c, i) => (
                <tr key={c.phone} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-yellow-100 text-yellow-700' :
                      i === 1 ? 'bg-gray-100 text-gray-600' :
                      i === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.orderCount}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatCurrency(c.totalSpent)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-orange-400 transition-all"
                        style={{ width: `${(c.totalSpent / maxSpent) * 100}%` }}
                      />
                    </div>
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
