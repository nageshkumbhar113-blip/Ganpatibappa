'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Trash2, Loader2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface QuoteItem {
  product_name: string
  description: string
  quantity: number
  price: number
}

export default function CreateQuotationPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [customer, setCustomer] = useState({ name: '', phone: '', email: '', address: '' })
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([
    { product_name: '', description: '', quantity: 1, price: 0 },
  ])

  const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0)

  function addItem() {
    setItems((prev) => [...prev, { product_name: '', description: '', quantity: 1, price: 0 }])
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof QuoteItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (items.some((i) => !i.product_name)) {
      toast.error('All items must have a name')
      return
    }

    startTransition(async () => {
      const res = await fetch('/api/admin/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customer.name,
          customer_phone: customer.phone,
          customer_email: customer.email || undefined,
          customer_address: customer.address || undefined,
          valid_until: validUntil || undefined,
          notes: notes || undefined,
          total_amount: total,
          items,
        }),
      })

      if (res.ok) {
        toast.success('Quotation created')
        router.push('/admin/quotations')
      } else {
        const d = await res.json()
        toast.error(d.error ?? 'Failed to create quotation')
      }
    })
  }

  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/admin/quotations" className="text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-gray-900">New Quotation</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Customer */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Customer Details</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
              <input
                required
                value={customer.name}
                onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone *</label>
              <input
                required
                type="tel"
                value={customer.phone}
                onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
              <input
                type="email"
                value={customer.email}
                onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Address</label>
            <textarea
              rows={2}
              value={customer.address}
              onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Items</h2>

          {items.map((item, i) => (
            <div key={i} className="rounded-lg border border-gray-100 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">Item {i + 1}</p>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input
                    required
                    value={item.product_name}
                    onChange={(e) => updateItem(i, 'product_name', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Product / Murti name *"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Quantity"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    min="0"
                    value={item.price}
                    onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value))}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Price (₹)"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    value={item.description}
                    onChange={(e) => updateItem(i, 'description', e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Description (optional)"
                  />
                </div>
              </div>
              <p className="text-right text-xs font-semibold text-gray-700">
                Subtotal: {formatCurrency(item.quantity * item.price)}
              </p>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>

          <div className="pt-2 border-t border-gray-100 flex justify-between">
            <span className="text-sm font-bold text-gray-700">Total</span>
            <span className="text-sm font-bold text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <label className="text-xs font-medium text-gray-600 block mb-1">Notes / Terms</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            placeholder="Payment terms, delivery conditions…"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl bg-orange-500 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Create Quotation
        </button>
      </form>
    </div>
  )
}
