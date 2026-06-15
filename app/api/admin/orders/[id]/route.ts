import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/middleware/auth-guard'
import { logAuditEvent } from '@/lib/utils/audit-logger'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const { data, error } = await supabase
      .from('orders')
      .select(
        `*, order_items(*, products(name, images)),
         advance_payments(id, amount, payment_method, status, paid_at)`
      )
      .eq('id', params.id)
      .eq('shop_id', user.shop_id!)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    return NextResponse.json({ order: data })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin()
    const supabase = createClient()

    const body = await req.json()

    // Only allow certain fields to be updated
    const allowed = [
      'status', 'payment_status', 'notes', 'pickup_date', 'delivery_date',
      'advance_amount', 'customer_address',
    ]

    const updateData: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) updateData[key] = body[key]
    }

    // Verify order belongs to shop
    const { data: existing } = await supabase
      .from('orders')
      .select('*')
      .eq('id', params.id)
      .eq('shop_id', user.shop_id!)
      .single()

    if (!existing) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    // Audit log
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '0.0.0.0'
    await logAuditEvent({
      shopId: user.shop_id!,
      userId: user.id,
      action: 'update',
      tableName: 'orders',
      recordId: params.id,
      oldValue: { status: existing.status, payment_status: existing.payment_status },
      newValue: { status: updated.status, payment_status: updated.payment_status },
      ipAddress: ip,
    })

    return NextResponse.json({ order: updated })
  } catch (error: any) {
    console.error('[PATCH /api/admin/orders/[id]]', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
