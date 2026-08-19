import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { handleApiError } from '@/lib/utils/api-error'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl

    // The admin Reports page sends ?year=2026&month=8; the combined
    // ?month=2026-08 form is also accepted. Previously only the combined form
    // was parsed, so the page's own request produced year=8, month=NaN and
    // threw "Invalid time value" on every load.
    const now = new Date()
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')

    let year: number
    let month: number

    if (monthParam?.includes('-')) {
      const [y, m] = monthParam.split('-').map(Number)
      year = y
      month = m
    } else {
      year = yearParam ? Number(yearParam) : now.getFullYear()
      month = monthParam ? Number(monthParam) : now.getMonth() + 1
    }

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 })
    }

    const monthYear = `${year}-${String(month).padStart(2, '0')}`

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
  } catch (error) {
    return handleApiError(error, 'admin/reports/monthly')
  }
}
