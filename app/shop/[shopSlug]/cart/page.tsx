'use client'

import Link from 'next/link'
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { useShop } from '@/lib/contexts/shop-context'
import { formatCurrency } from '@/lib/utils/format'

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalAmount, clearCart } = useCart()
  const { basePath } = useShop()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 text-gray-400 px-4">
        <ShoppingBag className="h-16 w-16 opacity-30" />
        <p className="text-lg font-medium">Your cart is empty</p>
        <Link href={`${basePath}/products`} className="mt-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">Shop Now</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-900">Cart ({items.length} item{items.length !== 1 ? 's' : ''})</h1>
          <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600 transition-colors">Clear all</button>
        </div>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-3">
              <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-orange-50">
                {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="h-full flex items-center justify-center text-2xl">🙏</div>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 line-clamp-2">{item.name}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                <div className="flex items-center gap-1 rounded-full border border-gray-200 bg-white">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="h-7 w-7 flex items-center justify-center text-gray-500"><Minus className="h-3 w-3" /></button>
                  <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="h-7 w-7 flex items-center justify-center text-gray-500"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
          </div>
          <Link href={`${basePath}/checkout`} className="flex-1 text-center rounded-xl bg-orange-500 py-3.5 text-sm font-bold text-white hover:bg-orange-600 transition-colors">
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  )
}
