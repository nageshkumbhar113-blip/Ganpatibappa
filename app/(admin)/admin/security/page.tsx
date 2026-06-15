'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Shield, Activity, Globe, Plus, Trash2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/format'

type Tab = 'audit' | 'login' | 'ip'

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>('audit')
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loginHistory, setLoginHistory] = useState<any[]>([])
  const [ipRules, setIpRules] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [newIp, setNewIp] = useState('')

  useEffect(() => {
    loadTab(tab)
  }, [tab])

  async function loadTab(t: Tab) {
    setIsLoading(true)
    try {
      if (t === 'audit') {
        const d = await fetch('/api/admin/security/audit-logs').then((r) => r.json())
        setAuditLogs(d.logs ?? [])
      } else if (t === 'login') {
        const d = await fetch('/api/admin/security/login-history').then((r) => r.json())
        setLoginHistory(d.history ?? [])
      } else if (t === 'ip') {
        const d = await fetch('/api/admin/security/ip').then((r) => r.json())
        setIpRules(d.rules ?? [])
      }
    } catch {
      toast.error('Failed to load security data')
    } finally {
      setIsLoading(false)
    }
  }

  async function addIpRule() {
    if (!newIp.trim()) return
    const res = await fetch('/api/admin/security/ip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip_address: newIp.trim(), rule_type: 'blocklist' }),
    })
    if (res.ok) {
      const d = await res.json()
      if (d.error) {
        toast.error(d.error)
      } else {
        setIpRules((prev) => [...prev, d.rule])
        setNewIp('')
        toast.success('IP rule added')
      }
    }
  }

  async function deleteIpRule(id: string) {
    const res = await fetch(`/api/admin/security/ip?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      setIpRules((prev) => prev.filter((r) => r.id !== id))
      toast.success('Rule removed')
    }
  }

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'audit', label: 'Audit Logs', icon: Activity },
    { key: 'login', label: 'Login History', icon: Shield },
    { key: 'ip', label: 'IP Restrictions', icon: Globe },
  ]

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Security</h1>
        <p className="text-sm text-gray-500">Audit logs, login history, and IP restrictions</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
      ) : (
        <>
          {/* Audit Logs */}
          {tab === 'audit' && (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No audit logs yet.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Action</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Table</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">IP</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.action === 'DELETE' ? 'bg-red-100 text-red-700' :
                            log.action === 'INSERT' ? 'bg-green-100 text-green-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600">{log.table_name}</td>
                        <td className="px-4 py-2.5 text-gray-400 font-mono text-xs">{log.ip_address ?? '—'}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateTime(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Login History */}
          {tab === 'login' && (
            <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
              {loginHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No login history yet.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">IP</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loginHistory.map((log: any) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800">{log.users?.full_name}</p>
                          <p className="text-xs text-gray-400">{log.users?.email}</p>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{log.ip_address}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {log.success ? 'Success' : 'Failed'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateTime(log.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* IP Restrictions */}
          {tab === 'ip' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Enter IP address or CIDR (e.g. 192.168.1.1)"
                  onKeyDown={(e) => e.key === 'Enter' && addIpRule()}
                />
                <button
                  onClick={addIpRule}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  <Plus className="h-4 w-4" />
                  Block IP
                </button>
              </div>

              {ipRules.length === 0 ? (
                <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>No IP restrictions configured. All IPs are allowed.</p>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">IP Address</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Rule</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Added</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {ipRules.map((rule: any) => (
                        <tr key={rule.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-sm text-gray-800">{rule.ip_address}</td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              rule.rule_type === 'blocklist' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {rule.rule_type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateTime(rule.created_at)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              onClick={() => deleteIpRule(rule.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
