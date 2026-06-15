import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const user = await requireAdmin()
  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') ?? '10')

  const supabase = createClient()

  const { data, error } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, total_amount, status')
    .eq('shop_id', user.shop_id!)
    .neq('status', 'cancelled')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by phone
  const customerMap = new Map<string, { name: string; phone: string; totalSpent: number; orderCount: number }>()
  for (const order of data ?? []) {
    const key = order.customer_phone
    const existing = customerMap.get(key) ?? {
      name: order.customer_name,
      phone: order.customer_phone,
      totalSpent: 0,
      orderCount: 0,
    }
    existing.totalSpent += order.total_amount
    existing.orderCount += 1
    customerMap.set(key, existing)
  }

  const customers = Array.from(customerMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit)

  return NextResponse.json({ customers })
}
