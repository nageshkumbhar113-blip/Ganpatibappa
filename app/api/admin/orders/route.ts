import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const paymentStatus = searchParams.get('payment_status')
    const q = searchParams.get('q')
    const customerId = searchParams.get('customer_id')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100)
    const offset = (page - 1) * limit

    let query = supabase
      .from('orders')
      .select(
        `id, order_number, customer_name, customer_phone, customer_id,
         total_amount, advance_amount, status, payment_status,
         pickup_date, delivery_date, created_at`,
        { count: 'exact' }
      )
      .eq('shop_id', user.shop_id!)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (paymentStatus) query = query.eq('payment_status', paymentStatus)
    if (customerId) query = query.eq('customer_id', customerId)
    if (q) {
      query = query.or(
        `customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%,order_number.ilike.%${q}%`
      )
    }

    const { data, count, error } = await query
    if (error) throw error

    return NextResponse.json({ orders: data, total: count, page, limit })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
