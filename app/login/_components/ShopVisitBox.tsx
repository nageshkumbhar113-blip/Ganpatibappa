'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store, ArrowRight } from 'lucide-react'

export function ShopVisitBox() {
  const [slug, setSlug] = useState('')
  const router = useRouter()

  function handleVisit(e: React.FormEvent) {
    e.preventDefault()
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (clean) router.push(`/shop/${clean}`)
  }

  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Store className="h-4 w-4 text-orange-500" />
        <p className="text-sm font-semibold text-orange-700">तुमच्या दुकानाला भेट द्या</p>
      </div>
      <form onSubmit={handleVisit} className="flex gap-2">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="shop-name टाका (e.g. chintamaniarts)"
          className="flex-1 rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          type="submit"
          disabled={!slug.trim()}
          className="inline-flex items-center gap-1 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
        >
          जा
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-2 text-[11px] text-orange-500">
        URL: ganpatibappa-alpha.vercel.app/shop/<strong>shop-name</strong>
      </p>
    </div>
  )
}
