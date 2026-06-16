'use client'

import { createContext, useContext, useCallback } from 'react'

interface ShopContextValue {
  shopSlug: string
  basePath: string
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>
}

const ShopContext = createContext<ShopContextValue>({
  shopSlug: '',
  basePath: '',
  apiFetch: fetch,
})

export function ShopProvider({
  shopSlug,
  children,
}: {
  shopSlug: string
  children: React.ReactNode
}) {
  const basePath = `/shop/${shopSlug}`

  const apiFetch = useCallback(
    (url: string, options?: RequestInit) =>
      fetch(url, {
        ...options,
        headers: {
          ...(options?.headers as Record<string, string>),
          'x-shop-slug': shopSlug,
        },
      }),
    [shopSlug]
  )

  return (
    <ShopContext.Provider value={{ shopSlug, basePath, apiFetch }}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  return useContext(ShopContext)
}
