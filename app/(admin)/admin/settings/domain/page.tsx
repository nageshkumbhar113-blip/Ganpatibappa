'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Globe, Plus, Trash2, CheckCircle2, XCircle, Clock,
  Loader2, Copy, RefreshCw, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface DomainMapping {
  id: string
  domain: string
  dns_verified: boolean
  dns_txt_record: string
  ssl_status: string
  last_checked_at: string | null
  created_at: string
}

function StatusBadge({ verified, ssl }: { verified: boolean; ssl: string }) {
  if (verified && ssl === 'active') {
    return <Badge className="bg-green-100 text-green-700 border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Active</Badge>
  }
  if (verified) {
    return <Badge className="bg-blue-100 text-blue-700 border-0"><Clock className="h-3 w-3 mr-1" />SSL Pending</Badge>
  }
  return <Badge className="bg-yellow-100 text-yellow-700 border-0"><Clock className="h-3 w-3 mr-1" />Verification Pending</Badge>
}

export default function DomainPage() {
  const [domains, setDomains] = useState<DomainMapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newDomain, setNewDomain] = useState('')
  const [isAdding, startAdd] = useTransition()
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [shopSlug, setShopSlug] = useState('')
  const [platformDomain, setPlatformDomain] = useState('')

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/domain').then((r) => r.json()),
      fetch('/api/admin/settings').then((r) => r.json()),
    ])
      .then(([dm, st]) => {
        setDomains(dm.domains ?? [])
        setShopSlug(st.shop?.slug ?? '')
        setPlatformDomain(process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? window.location.hostname)
      })
      .catch(() => toast.error('Failed to load domain settings'))
      .finally(() => setIsLoading(false))
  }, [])

  function addDomain(e: React.FormEvent) {
    e.preventDefault()
    const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')
    if (!domain) return

    startAdd(async () => {
      const res = await fetch('/api/admin/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })
      const d = await res.json()
      if (res.ok) {
        setDomains((prev) => [d.domain, ...prev])
        setNewDomain('')
        toast.success('Domain added! Now add the DNS TXT record shown below.')
      } else {
        toast.error(d.error ?? 'Failed to add domain')
      }
    })
  }

  async function verifyDomain(id: string) {
    setVerifyingId(id)
    try {
      const res = await fetch('/api/admin/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const d = await res.json()
      if (d.verified) {
        setDomains((prev) =>
          prev.map((dm) => dm.id === id ? { ...dm, dns_verified: true, ssl_status: 'active' } : dm)
        )
        toast.success(d.message)
      } else {
        toast.error(d.message)
      }
    } catch {
      toast.error('Verification failed')
    } finally {
      setVerifyingId(null)
    }
  }

  async function deleteDomain(id: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/domain?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setDomains((prev) => prev.filter((d) => d.id !== id))
        toast.success('Domain removed')
      } else {
        toast.error('Failed to remove domain')
      }
    } finally {
      setDeletingId(null)
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Copied!')
  }

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-orange-500" /></div>
  }

  const pathUrl = shopSlug ? `${window.location.origin}/shop/${shopSlug}` : null

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Globe className="h-5 w-5 text-orange-500" />
          Domain Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">आपल्या shop साठी URL आणि custom domain manage करा</p>
      </div>

      {/* ✅ FREE PATH URL — primary, always works */}
      {pathUrl && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <p className="text-xs font-bold text-green-700 uppercase tracking-wide">तुमचा Shop URL — आत्ता काम करतो ✅</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-green-900 bg-white border border-green-200 px-3 py-2 rounded-lg break-all">{pathUrl}</code>
            <button onClick={() => copyText(pathUrl)} className="shrink-0 text-green-600 hover:text-green-800 p-1">
              <Copy className="h-4 w-4" />
            </button>
            <a href={pathUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-green-600 hover:text-green-800 p-1">
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="text-xs text-green-600">हा URL कोणाला पण share करा — WhatsApp, Instagram, Facebook वर</p>
        </div>
      )}

      {/* Custom Domain Section header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Custom Domain जोडा</h2>
        <form onSubmit={addDomain} className="flex gap-2">
          <div className="flex-1">
            <Input
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              placeholder="nagesharts.in"
              type="text"
              disabled={isAdding}
            />
          </div>
          <Button type="submit" disabled={isAdding || !newDomain.trim()} className="bg-orange-500 hover:bg-orange-600 text-white shrink-0">
            {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Domain
          </Button>
        </form>
        <p className="text-xs text-gray-400 mt-2">फक्त domain name टाका, https:// नको. उदा: <code>nagesharts.in</code></p>
      </div>

      {/* How to verify */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2">
        <p className="text-sm font-semibold text-amber-800">Domain Verify कसे करायचे?</p>
        <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
          <li>खाली दिलेला TXT record तुमच्या Domain Provider च्या DNS settings मध्ये जोडा</li>
          <li>DNS propagate होण्यासाठी 10 मिनिटे ते 24 तास लागू शकतात</li>
          <li>"Check Verification" button दाबा</li>
          <li>Verified झाल्यावर domain automatically active होईल</li>
        </ol>
        <div className="mt-2 text-xs text-amber-700">
          <strong>Vercel वर point करायला:</strong>
          <ul className="list-disc list-inside mt-1 space-y-0.5">
            <li>A record → <code className="bg-amber-100 px-1">76.76.21.21</code></li>
            <li>CNAME www → <code className="bg-amber-100 px-1">cname.vercel-dns.com</code></li>
          </ul>
        </div>
      </div>

      {/* Domains List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          {domains.length === 0 ? 'No custom domains added yet' : `Custom Domains (${domains.length})`}
        </h2>

        {domains.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 font-mono">{d.domain}</p>
                  <StatusBadge verified={d.dns_verified} ssl={d.ssl_status} />
                </div>
                {d.last_checked_at && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Last checked: {new Date(d.last_checked_at).toLocaleString('mr-IN')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!d.dns_verified && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyDomain(d.id)}
                    disabled={verifyingId === d.id}
                    className="text-xs"
                  >
                    {verifyingId === d.id
                      ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      : <RefreshCw className="h-3 w-3 mr-1" />}
                    Check
                  </Button>
                )}
                {d.dns_verified && (
                  <a
                    href={`https://${d.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Visit
                  </a>
                )}
                <button
                  onClick={() => deleteDomain(d.id)}
                  disabled={deletingId === d.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  {deletingId === d.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* TXT Record */}
            {!d.dns_verified && d.dns_txt_record && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600">DNS TXT Record तुमच्या Domain Provider मध्ये जोडा:</p>
                <div className="grid gap-1.5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-14 shrink-0">Type:</span>
                    <code className="bg-white px-2 py-0.5 rounded border text-gray-800">TXT</code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-14 shrink-0">Name:</span>
                    <code className="bg-white px-2 py-0.5 rounded border text-gray-800">@</code>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-gray-500 w-14 shrink-0 mt-0.5">Value:</span>
                    <div className="flex-1 flex items-start gap-1">
                      <code className="bg-white px-2 py-0.5 rounded border text-gray-800 break-all flex-1 text-[11px]">
                        {d.dns_txt_record}
                      </code>
                      <button
                        onClick={() => copyText(d.dns_txt_record)}
                        className="shrink-0 p-1 text-gray-400 hover:text-gray-700"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {d.dns_verified && (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="h-4 w-4" />
                <p className="text-xs font-medium">
                  Domain verified आणि active आहे. Customer <strong>https://{d.domain}</strong> वर shop access करू शकतात.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
