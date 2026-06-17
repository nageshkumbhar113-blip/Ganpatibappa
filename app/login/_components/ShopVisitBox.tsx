'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, ArrowRight, ExternalLink } from 'lucide-react'

export function ShopVisitBox() {
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const router = useRouter()

  useEffect(() => {
    const s = localStorage.getItem('ganpati_shop_slug')
    setSavedSlug(s)
  }, [])

  function handleVisit(e: React.FormEvent) {
    e.preventDefault()
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '')
    if (clean) router.push(`/shop/${clean}`)
  }

  if (savedSlug) {
    const shopUrl = `/shop/${savedSlug}`
    return (
      <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Store className="h-4 w-4 text-orange-500" />
          <p className="text-sm font-semibold text-orange-700">तुमचं दुकान</p>
        </div>
        <a
          href={shopUrl}
          className="flex items-center justify-between w-full rounded-xl bg-orange-500 hover:bg-orange-600 px-4 py-3 text-white transition-colors"
        >
          <span className="text-sm font-bold">🛕 {savedSlug}</span>
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            Shop वर जा <ExternalLink className="h-4 w-4" />
          </div>
        </a>
        <button
          onClick={() => setSavedSlug(null)}
          className="mt-2 text-[11px] text-orange-400 hover:text-orange-600 underline"
        >
          वेगळ्या shop चं नाव टाका
        </button>
      </div>
    )
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
