import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const shopId = headers().get('x-shop-id')
  if (!shopId) return NextResponse.json({ error: 'Shop not found' }, { status: 404 })

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: order, error } = await admin
    .from('orders')
    .select(`
      *,
      order_items(*, products(name, images))
    `)
    .eq('id', params.id)
    .eq('shop_id', shopId)
    .single()

  if (error || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

  // Only the order's owner can view it
  if (order.customer_id && order.customer_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json({ order })
}
