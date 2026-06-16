'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  slug: string
}

interface CartState {
  shopId: string | null
  items: CartItem[]
  totalItems: number
  totalAmount: number
  addItem: (shopId: string, item: Omit<CartItem, 'quantity'>) => void
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

      addItem: (shopId, item) => {
        set((state) => {
          const base = state.shopId && state.shopId !== shopId ? [] : state.items
          const existing = base.find((i) => i.id === item.id)
          const items = existing
            ? base.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
            : [...base, { ...item, quantity: 1 }]
          return { shopId, items, ...totals(items) }
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
    { name: 'ganpatibappa-cart', version: 2 }
  )
)
