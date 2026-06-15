'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Search, Server } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'

interface AuditLog {
  id: string
  shop_id: string
  user_id: string
  action: string
  entity_type: string
  entity_id?: string
  changes?: Record<string, any>
  ip_address?: string
  created_at: string
  shops?: { name: string; slug: string }
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setIsLoading(true)
    const params = new URLSearchParams({ page: String(page), global: 'true' })
    if (search) params.set('q', search)
    fetch(`/api/admin/security/audit-logs?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) toast.error(d.error)
        setLogs(d.logs ?? [])
        setTotal(d.total ?? 0)
      })
      .catch(() => toast.error('Failed to load logs'))
      .finally(() => setIsLoading(false))
  }, [page, search])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">System-wide action trail — {total} entries</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by action, entity…"
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Server className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No audit logs found</p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Shop</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Entity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">IP</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-gray-100 text-gray-700 rounded px-1.5 py-0.5">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {log.shops?.name ?? log.shop_id?.slice(0, 8) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id.slice(0, 6)}` : ''}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{log.ip_address ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
