import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const user = await requireAdmin()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '10')

  const supabase = createClient()

  // Top products by revenue (sum of order_items.subtotal)
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      product_id,
      product_name,
      subtotal,
      quantity,
      orders!inner(shop_id, status)
    `)
    .eq('orders.shop_id', user.shop_id!)
    .neq('orders.status', 'cancelled')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by product
  const productMap = new Map<string, { name: string; revenue: number; units: number }>()
  for (const item of data ?? []) {
    const existing = productMap.get(item.product_id) ?? { name: item.product_name, revenue: 0, units: 0 }
    existing.revenue += item.subtotal
    existing.units += item.quantity
    productMap.set(item.product_id, existing)
  }

  const products = Array.from(productMap.entries())
    .map(([id, val]) => ({ product_id: id, ...val }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)

  return NextResponse.json({ products })
}
