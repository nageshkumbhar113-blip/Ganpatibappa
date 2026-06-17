'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  slug?: string
}

interface CartState {
  shopId: string | null
  items: CartItem[]
  totalItems: number
  totalAmount: number
  addItem: (shopSlug: string, item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clearCart: () => void
}

function totals(items: CartItem[]) {
  return {
    totalItems: items.reduce((s, i) => s + i.quantity, 0),
    totalAmount: items.reduce((s, i) => s + i.price * i.quantity, 0),
  }
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: null,
      items: [],
      totalItems: 0,
      totalAmount: 0,

      addItem: (shopSlug, item) => {
        set((state) => {
          const qty = item.quantity ?? 1
          // Clear cart if switching to a different shop
          const base = state.shopId && state.shopId !== shopSlug ? [] : state.items
          const existing = base.find((i) => i.id === item.id)
          const items = existing
            ? base.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + qty } : i))
            : [...base, { ...item, quantity: qty }]
          return { shopId: shopSlug, items, ...totals(items) }
        })
      },

      removeItem: (id) => {
        set((state) => {
          const items = state.items.filter((i) => i.id !== id)
          return { items, ...totals(items) }
        })
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) { get().removeItem(id); return }
        set((state) => {
          const items = state.items.map((i) => (i.id === id ? { ...i, quantity } : i))
          return { items, ...totals(items) }
        })
      },

      clearCart: () => set({ items: [], shopId: null, totalItems: 0, totalAmount: 0 }),
    }),
    { name: 'ganpatibappa-cart', version: 3 }
  )
)
