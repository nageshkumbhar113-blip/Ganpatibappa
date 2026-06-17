'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import { useShop } from '@/lib/contexts/shop-context'

export default function WishlistPage() {
  const { basePath, apiFetch } = useShop()
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    apiFetch('/api/shop/wishlist')
      .then((r) => r.json())
      .then((d) => setItems(d.wishlist ?? d.items ?? []))
      .catch(() => toast.error('Failed to load wishlist'))
      .finally(() => setIsLoading(false))
  }, [])

  async function removeItem(productId: string) {
    await apiFetch('/api/shop/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    setItems((prev) => prev.filter((i) => i.product_id !== productId))
    toast.success('Wishlist मधून काढले')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500" /> My Wishlist
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20 text-gray-400 space-y-3">
            <Heart className="h-12 w-12 mx-auto opacity-20" />
            <p className="text-sm">Wishlist रिकामी आहे</p>
            <Link href={basePath} className="inline-block text-orange-500 hover:underline text-sm">
              Products पाहा
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((item: any) => {
              const p = item.products
              if (!p) return null
              return (
                <div key={item.product_id} className="group relative rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                  <button onClick={() => removeItem(item.product_id)}
                    className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center text-red-400 hover:text-red-600 shadow">
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                  <Link href={`${basePath}/products/${p.slug}`}>
                    <div className="h-36 bg-orange-50 overflow-hidden">
                      {p.images?.[0]
                        ? <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                        : <div className="h-full flex items-center justify-center text-4xl">🙏</div>}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name}</p>
                      {p.height_cm && <p className="text-xs text-gray-400">{p.height_cm} cm</p>}
                      <p className="mt-1 text-sm font-bold text-gray-900">{formatCurrency(p.offer_price ?? p.price)}</p>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
