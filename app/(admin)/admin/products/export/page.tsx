'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ProductExportPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx')

  async function handleExport() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/products/export?format=${format}`)
      if (!res.ok) { toast.error('Export failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `products-export.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Export downloaded!')
    } catch {
      toast.error('Export failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Export Products</h1>
          <p className="text-sm text-gray-500">सर्व products download करा</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-5 space-y-5">
        <div>
          <p className="text-sm font-bold text-gray-900 mb-3">Export Format निवडा</p>
          <div className="grid grid-cols-2 gap-3">
            {(['xlsx', 'csv'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  format === f
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet className={`h-6 w-6 mb-2 ${format === f ? 'text-orange-500' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold ${format === f ? 'text-orange-700' : 'text-gray-700'}`}>
                  .{f.toUpperCase()}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {f === 'xlsx' ? 'Excel format — images + formatting' : 'CSV — simple text format'}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 space-y-1">
          <p className="font-semibold text-gray-700">Export मध्ये येणारे columns:</p>
          <p>name, slug, category, price, offer_price, stock, description, material, height_cm, is_featured, is_active, created_at</p>
        </div>

        <button
          onClick={handleExport}
          disabled={isLoading}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {isLoading ? 'Preparing export…' : `Download .${format.toUpperCase()}`}
        </button>
      </div>
    </div>
  )
}
