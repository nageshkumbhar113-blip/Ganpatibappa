'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { ChevronLeft, Upload, FileSpreadsheet, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export default function ProductImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && (f.name.endsWith('.xlsx') || f.name.endsWith('.csv'))) {
      setFile(f)
      setResult(null)
    } else {
      toast.error('Only .xlsx or .csv files allowed')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) { setFile(f); setResult(null) }
  }

  async function handleImport() {
    if (!file) return
    startTransition(async () => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/admin/products/import', { method: 'POST', body: formData })
      const d = await res.json()
      if (res.ok) {
        setResult(d)
        toast.success(`Imported ${d.imported} products`)
      } else {
        toast.error(d.error ?? 'Import failed')
      }
    })
  }

  async function handleDownloadTemplate() {
    const res = await fetch('/api/admin/products/export?template=true')
    if (!res.ok) { toast.error('Failed to download template'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'products-template.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/products" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Bulk Import Products</h1>
          <p className="text-sm text-gray-500">Excel (.xlsx) किंवा CSV file upload करा</p>
        </div>
      </div>

      {/* Template download */}
      <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-orange-800">Step 1: Template Download करा</p>
          <p className="text-xs text-orange-600 mt-0.5">
            Template मध्ये सर्व columns ready आहेत — fill करा आणि upload करा
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          Download Template
        </button>
      </div>

      {/* Column guide */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-4">
        <p className="text-xs font-bold text-gray-700 mb-3">Required Columns</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['name *', 'Product name'],
            ['price *', 'Selling price (₹)'],
            ['category', 'Category name'],
            ['description', 'Product description'],
            ['offer_price', 'Sale price (optional)'],
            ['stock', 'Stock quantity'],
            ['height_cm', 'Height in cm'],
            ['material', 'Material type'],
            ['is_featured', 'true / false'],
            ['is_active', 'true / false'],
          ].map(([col, desc]) => (
            <div key={col} className="flex gap-2">
              <span className="font-mono text-orange-600 font-medium">{col}</span>
              <span className="text-gray-400">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-orange-400 bg-orange-50'
            : file
            ? 'border-green-400 bg-green-50'
            : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/40'
        }`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFileChange} />
        {file ? (
          <>
            <FileSpreadsheet className="h-10 w-10 mx-auto text-green-500 mb-2" />
            <p className="font-semibold text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p className="font-medium text-gray-600">Drag & drop file here</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx किंवा .csv · Max 10MB</p>
          </>
        )}
      </div>

      {/* Import button */}
      {file && (
        <button
          onClick={handleImport}
          disabled={isPending}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {isPending ? 'Importing…' : `Import "${file.name}"`}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm p-5 space-y-3">
          <p className="text-sm font-bold text-gray-900">Import Result</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span className="text-sm font-semibold">{result.imported} imported</span>
            </div>
            {result.skipped > 0 && (
              <div className="flex items-center gap-2 text-yellow-600">
                <XCircle className="h-5 w-5" />
                <span className="text-sm font-semibold">{result.skipped} skipped</span>
              </div>
            )}
          </div>
          {result.errors.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-100 p-3 space-y-1">
              {result.errors.map((e, i) => (
                <p key={i} className="text-xs text-red-600">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
