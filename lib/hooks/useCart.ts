'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: string
  productName: string
  price: number
  quantity: number
  imageUrl?: string
  slug: string
}

interface CartState {
  shopId: string | null
  items: CartItem[]
  addItem: (shopId: string, item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  totalItems: () => number
  totalAmount: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      shopId: null,
      items: [],

      addItem: (shopId, item) => {
        set((state) => {
          // Clear cart if switching shops
          const items = state.shopId && state.shopId !== shopId ? [] : state.items

          const existing = items.find((i) => i.productId === item.productId)
          if (existing) {
            return {
              shopId,
              items: items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { shopId, items: [...items, { ...item, quantity: 1 }] }
        })
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }))
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i
          ),
        }))
      },

      clearCart: () => set({ items: [], shopId: null }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      totalAmount: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      name: 'ganpatibappa-cart',
      version: 1,
    }
  )
)
