'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils/format'
import { getWishlistIds, removeFromWishlist } from '@/lib/utils/local-wishlist'

export default function WishlistPage() {
  const [items, setItems] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // (shop) tree = one hostname per shop (subdomain/custom domain), so the
    // hostname itself is a safe per-shop wishlist scope.
    const ids = getWishlistIds(window.location.hostname)
    if (ids.length === 0) {
      setIsLoading(false)
      return
    }
    fetch(`/api/shop/products?ids=${ids.join(',')}`)
      .then((r) => r.json())
      .then((d) => setItems(d.products ?? []))
      .catch(() => toast.error('Failed to load wishlist'))
      .finally(() => setIsLoading(false))
  }, [])

  function removeItem(productId: string) {
    removeFromWishlist(window.location.hostname, productId)
    setItems((prev) => prev.filter((p) => p.id !== productId))
    toast.success('Removed from wishlist')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">My Wishlist</h1>

        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 space-y-3">
            <Heart className="h-12 w-12 mx-auto opacity-30" />
            <p>Your wishlist is empty</p>
            <Link href="/products" className="inline-block text-orange-500 hover:underline text-sm">
              Browse products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((p: any) => (
              <div
                key={p.id}
                className="group relative rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm"
              >
                <button
                  onClick={() => removeItem(p.id)}
                  className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-white/90 flex items-center justify-center text-red-400 hover:text-red-600 shadow"
                >
                  <Heart className="h-4 w-4 fill-current" />
                </button>
                <Link href={`/products/${p.slug}`}>
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
                      <p className="text-xs text-gray-400">{p.height_cm} cm</p>
                    )}
                    <p className="mt-1 text-sm font-bold text-gray-900">
                      {formatCurrency(p.offer_price ?? p.price)}
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
