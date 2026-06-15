import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl
    const dateStr = searchParams.get('date') ?? new Date().toISOString().substring(0, 10)

    const start = `${dateStr}T00:00:00.000Z`
    const end = `${dateStr}T23:59:59.999Z`

    const [
      { data: orders },
      { count: newCustomers },
      { count: newInquiries },
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('id, order_number, customer_name, total_amount, advance_amount, status, payment_status, created_at')
        .eq('shop_id', user.shop_id!)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false }),
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', user.shop_id!)
        .eq('role', 'customer')
        .gte('created_at', start)
        .lte('created_at', end),
      supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', user.shop_id!)
        .gte('created_at', start)
        .lte('created_at', end),
    ])

    const totalRevenue = (orders ?? []).reduce(
      (sum, o) => (o.status !== 'cancelled' ? sum + (o.total_amount ?? 0) : sum),
      0
    )
    const totalAdvance = (orders ?? []).reduce(
      (sum, o) => sum + (o.advance_amount ?? 0),
      0
    )

    return NextResponse.json({
      date: dateStr,
      totalOrders: orders?.length ?? 0,
      totalRevenue,
      totalAdvance,
      newCustomers: newCustomers ?? 0,
      newInquiries: newInquiries ?? 0,
      orders: orders ?? [],
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
