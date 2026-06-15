import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl
    // Default: current month
    const monthYear = searchParams.get('month') ?? new Date().toISOString().substring(0, 7)
    const [year, month] = monthYear.split('-').map(Number)

    const start = new Date(year, month - 1, 1).toISOString()
    const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

    const { data: orders } = await supabase
      .from('orders')
      .select('total_amount, advance_amount, status, payment_status, created_at')
      .eq('shop_id', user.shop_id!)
      .gte('created_at', start)
      .lte('created_at', end)
      .not('status', 'eq', 'cancelled')

    // Build daily chart data
    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      revenue: 0,
      orders: 0,
    }))

    for (const order of orders ?? []) {
      const day = new Date(order.created_at).getDate()
      if (day >= 1 && day <= daysInMonth) {
        dailyData[day - 1].revenue += order.total_amount ?? 0
        dailyData[day - 1].orders += 1
      }
    }

    const totalRevenue = (orders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
    const totalAdvance = (orders ?? []).reduce((sum, o) => sum + (o.advance_amount ?? 0), 0)
    const paidCount = (orders ?? []).filter((o) => o.payment_status === 'paid').length
    const partialCount = (orders ?? []).filter((o) => o.payment_status === 'partial').length

    return NextResponse.json({
      month: monthYear,
      totalOrders: orders?.length ?? 0,
      totalRevenue,
      totalAdvance,
      paidCount,
      partialCount,
      dailyChart: dailyData,
    })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
