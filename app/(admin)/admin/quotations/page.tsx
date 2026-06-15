'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Plus, Loader2, FileText, Download } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

interface Quotation {
  id: string
  quotation_number: string
  customer_name: string
  customer_phone: string
  total_amount: number
  status: string
  valid_until?: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/quotations')
      .then((r) => r.json())
      .then((d) => {
        if (d.error === 'Feature not available') {
          toast.error('Quotations require a Premium or Basic plan upgrade')
        }
        setQuotations(d.quotations ?? [])
      })
      .catch(() => toast.error('Failed to load quotations'))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quotations</h1>
          <p className="text-sm text-gray-500">{quotations.length} quotations</p>
        </div>
        <Link
          href="/admin/quotations/create"
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Quotation
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No quotations yet. Create one for a customer.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Quotation</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Valid Until</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotations.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">#{q.quotation_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{q.customer_name}</p>
                    <p className="text-xs text-gray-400">{q.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatCurrency(q.total_amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[q.status] ?? 'bg-gray-100'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {q.valid_until ? formatDate(q.valid_until) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(q.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/admin/quotations/${q.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </a>
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
