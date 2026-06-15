'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

export default function RecentlyViewedPage() {
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shop/recently-viewed')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-5">Recently Viewed</h1>

        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-3">
            <Clock className="h-12 w-12 mx-auto opacity-30" />
            <p>No recently viewed products</p>
            <Link href="/products" className="inline-block text-orange-500 hover:underline text-sm">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item: any) => {
              const p = item.products
              if (!p) return null
              return (
                <Link
                  key={item.product_id}
                  href={`/products/${p.slug}`}
                  className="group rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="h-36 bg-orange-50 overflow-hidden">
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-4xl">🙏</div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2">{p.name}</p>
                    {p.height_cm && (
                      <p className="text-xs text-gray-400 mt-0.5">{p.height_cm} cm</p>
                    )}
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatCurrency(p.offer_price ?? p.price)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
