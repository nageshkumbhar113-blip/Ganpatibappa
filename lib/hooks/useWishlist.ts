'use client'

import { useState, useEffect, useCallback } from 'react'

interface WishlistItem {
  product_id: string
}

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shop/wishlist')
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  const isWishlisted = useCallback(
    (productId: string) => items.some((i) => i.product_id === productId),
    [items]
  )

  const toggle = useCallback(async (productId: string): Promise<boolean> => {
    const res = await fetch('/api/shop/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    if (!res.ok) return false

    const d = await res.json()
    if (d.added) {
      setItems((prev) => [...prev, { product_id: productId }])
    } else {
      setItems((prev) => prev.filter((i) => i.product_id !== productId))
    }
    return d.added
  }, [])

  return {
    items,
    isLoading,
    isWishlisted,
    toggle,
    totalItems: items.length,
  }
}
