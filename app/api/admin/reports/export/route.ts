import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { checkFeature } from '@/lib/middleware/plan-guard'
import { exportOrdersToExcel, exportReportToExcel } from '@/lib/excel/export'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl
    const type = searchParams.get('type') ?? 'orders'
    const format = searchParams.get('format') ?? 'excel'
    const monthYear = searchParams.get('month') ?? new Date().toISOString().substring(0, 7)

    const [year, month] = monthYear.split('-').map(Number)
    const start = new Date(year, month - 1, 1).toISOString()
    const end = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

    // Check export permission
    const hasExport = await checkFeature(user.shop_id!, 'reports_export')
    if (!hasExport) {
      return NextResponse.json({ error: 'Reports export requires Basic or Premium plan.' }, { status: 403 })
    }

    if (type === 'orders') {
      const { data: orders } = await supabase
        .from('orders')
        .select('order_number, customer_name, customer_phone, total_amount, advance_amount, status, payment_status, delivery_date, created_at')
        .eq('shop_id', user.shop_id!)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (format === 'excel') {
        const buffer = exportOrdersToExcel(orders ?? [])
        return new Response(buffer, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="orders-${monthYear}.xlsx"`,
          },
        })
      }
    }

    if (type === 'products') {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, subtotal, orders(created_at)')
        .eq('orders.shop_id', user.shop_id!)

      // Aggregate by product
      const productMap = new Map<string, { quantity: number; revenue: number }>()
      for (const item of items ?? []) {
        const existing = productMap.get(item.product_name) ?? { quantity: 0, revenue: 0 }
        productMap.set(item.product_name, {
          quantity: existing.quantity + (item.quantity ?? 0),
          revenue: existing.revenue + (item.subtotal ?? 0),
        })
      }

      const rows = Array.from(productMap.entries()).map(([name, stats]) => [
        name,
        stats.quantity,
        `₹${stats.revenue.toLocaleString('en-IN')}`,
      ])

      const buffer = exportReportToExcel(
        `Products Report - ${monthYear}`,
        ['Product Name', 'Units Sold', 'Revenue'],
        rows
      )

      return new Response(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="products-report-${monthYear}.xlsx"`,
        },
      })
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
  } catch (error: any) {
    console.error('[GET /api/admin/reports/export]', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
